const connectToDatabase = require("../config/db");
const OrderModel = require("../models/Order");

function sanitizeOrder(doc) {
  return {
    id: doc._id ? doc._id.toString() : doc.id,
    customerName: doc.customerName || "Customer",
    customerPhone: doc.customerPhone || "",
    customerEmail: doc.customerEmail || "",
    customerAddress: doc.customerAddress || "",
    items: doc.items || [],
    totalAmount: doc.totalAmount || 0,
    status: doc.status || "pending",
    notes: doc.notes || "",
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
  };
}

const INITIAL_SEED_ORDERS = [
  {
    customerName: "Priya Sharma",
    customerPhone: "+91 98765 43210",
    customerEmail: "priya.sharma@example.com",
    customerAddress: "45 MG Road, Indiranagar, Bengaluru, Karnataka",
    items: [
      { productName: "22K Gold Bridal Necklace", category: "necklaces", quantity: 1, price: 125000 },
      { productName: "Gold Antique Jhumka", category: "earrings", quantity: 1, price: 45000 },
    ],
    totalAmount: 170000,
    status: "pending",
    notes: "Express gift packing requested",
  },
  {
    customerName: "Rajesh Kumar Patel",
    customerPhone: "+91 98234 56789",
    customerEmail: "rajesh.patel@example.com",
    customerAddress: "12 Ring Road, Satellite, Ahmedabad, Gujarat",
    items: [
      { productName: "925 Sterling Silver Kada", category: "bangles", quantity: 2, price: 8500 },
    ],
    totalAmount: 17000,
    status: "confirmed",
    notes: "Call before delivery",
  },
  {
    customerName: "Ananya Roy",
    customerPhone: "+91 97112 34567",
    customerEmail: "ananya.roy@example.com",
    customerAddress: "78 Park Street, Kolkata, West Bengal",
    items: [
      { productName: "Solitaire Diamond Engagement Ring", category: "rings", quantity: 1, price: 89000 },
    ],
    totalAmount: 89000,
    status: "shipped",
    notes: "Shipped via BlueDart Insured Courier",
  },
  {
    customerName: "Vikramaditya Singh",
    customerPhone: "+91 99887 76655",
    customerEmail: "vikram.singh@example.com",
    customerAddress: "102 Royal Palm Drive, Jaipur, Rajasthan",
    items: [
      { productName: "Royal Kundan Choker Set", category: "necklaces", quantity: 1, price: 145000 },
    ],
    totalAmount: 145000,
    status: "delivered",
    notes: "Delivered & verified hallmark certificate",
  },
];

async function getAllOrders(req, res) {
  try {
    const conn = await connectToDatabase();
    let dbOrders = [];
    if (conn) {
      let docs = await OrderModel.find({}).sort({ createdAt: -1 }).lean();
      
      // Auto-seed if database orders collection is empty
      if (docs.length === 0) {
        try {
          await OrderModel.insertMany(INITIAL_SEED_ORDERS);
          docs = await OrderModel.find({}).sort({ createdAt: -1 }).lean();
        } catch (seedErr) {
          console.warn("Failed to seed initial orders:", seedErr);
        }
      }

      dbOrders = docs.map(sanitizeOrder);
    }

    return res.json({ success: true, count: dbOrders.length, orders: dbOrders });
  } catch (error) {
    console.error("Error in getAllOrders:", error);
    return res.status(500).json({ success: false, error: error.message, orders: [] });
  }
}

async function createOrder(req, res) {
  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return res.status(500).json({ success: false, error: "Database connection unavailable" });
    }

    const newOrder = await OrderModel.create(req.body);
    return res.status(201).json({
      success: true,
      message: "Order placed successfully! 🛍️",
      order: sanitizeOrder(newOrder),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || "Failed to create order" });
  }
}

async function updateOrderStatus(req, res) {
  try {
    const id = req.params.id || req.body.id;
    const { status, message, description } = req.body;
    if (!id || !status) {
      return res.status(400).json({ success: false, error: "Order ID and status are required" });
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return res.status(500).json({ success: false, error: "Database connection unavailable" });
    }

    const updated = await OrderModel.findByIdAndUpdate(id, { status }, { new: true }).lean();
    if (!updated) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    // Sync status with OrderTrackingModel if it exists
    const OrderTrackingModel = require("../models/OrderTracking");
    const tracking = await OrderTrackingModel.findOne({ orderId: id });
    if (tracking) {
      const mappedTrackingStatus = {
        pending: "order_placed",
        confirmed: "quality_checked",
        shipped: "shipped",
        delivered: "delivered",
        cancelled: "cancelled",
      }[status] || "order_placed";
      
      const customMessage = message || description || `Order status updated to ${status} by admin`;
      
      tracking.currentStatus = mappedTrackingStatus;
      tracking.history.push({
        status: mappedTrackingStatus,
        location: "System Update",
        description: customMessage,
        timestamp: new Date(),
      });
      if (status === "delivered") {
        tracking.currentLocation = updated.customerAddress || "Delivered";
      }
      await tracking.save();
    }

    return res.json({ success: true, message: "Order status updated", order: sanitizeOrder(updated) });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || "Failed to update order" });
  }
}

async function deleteOrder(req, res) {
  try {
    const id = req.params.id || req.query.id;
    if (!id) {
      return res.status(400).json({ success: false, error: "Order ID is required" });
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return res.status(500).json({ success: false, error: "Database connection unavailable" });
    }

    const deleted = await OrderModel.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    return res.json({ success: true, message: "Order deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || "Failed to delete order" });
  }
}

async function getOrderById(req, res) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: "Order ID is required" });
    }

    const conn = await connectToDatabase();
    if (conn) {
      // Check if valid ObjectId
      let orderDoc = null;
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        orderDoc = await OrderModel.findById(id).lean();
      }

      if (!orderDoc) {
        orderDoc = await OrderModel.findOne({
          $or: [
            { razorpayOrderId: id },
            { razorpayPaymentId: id }
          ]
        }).lean();
      }

      if (orderDoc) {
        return res.json({ success: true, order: sanitizeOrder(orderDoc) });
      }
    }

    return res.status(404).json({ success: false, error: "Order not found" });
  } catch (error) {
    console.error("Error in getOrderById:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function searchOrders(req, res) {
  try {
    const query = (req.query.q || req.query.query || req.query.email || req.query.phone || "").trim();
    if (!query) {
      return res.status(400).json({ success: false, error: "Search query is required", orders: [] });
    }

    const conn = await connectToDatabase();
    let dbOrders = [];
    if (conn) {
      const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i");
      const docs = await OrderModel.find({
        $or: [
          { customerEmail: regex },
          { customerPhone: regex },
          { customerName: regex },
          { razorpayOrderId: regex },
          { razorpayPaymentId: regex }
        ]
      }).sort({ createdAt: -1 }).lean();

      dbOrders = docs.map(sanitizeOrder);
    }

    return res.json({ success: true, count: dbOrders.length, orders: dbOrders });
  } catch (error) {
    console.error("Error in searchOrders:", error);
    return res.status(500).json({ success: false, error: error.message, orders: [] });
  }
}

module.exports = {
  getAllOrders,
  getOrderById,
  searchOrders,
  createOrder,
  updateOrderStatus,
  deleteOrder,
};
