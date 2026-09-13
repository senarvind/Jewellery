const connectToDatabase = require("../config/db");
const OrderModel = require("../models/Order");

const SAMPLE_ORDERS = [
  {
    id: "ord-sample-101",
    customerName: "Priya Sharma",
    customerPhone: "+91 98765 43210",
    customerEmail: "priya.sharma@example.com",
    customerAddress: "Flat 402, Royal Palms, MG Road, Jaipur, Rajasthan",
    items: [
      {
        productId: "sample-ring-1",
        productName: "22K Gold Solitaire Ring",
        category: "rings",
        quantity: 1,
        price: 24999,
      },
    ],
    totalAmount: 24999,
    status: "confirmed",
    notes: "Gift packaging requested with gold ribbon.",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "ord-sample-102",
    customerName: "Vikram Malhotra",
    customerPhone: "+91 98123 45678",
    customerEmail: "vikram.m@example.com",
    customerAddress: "Plot 12, Defense Colony, New Delhi",
    items: [
      {
        productId: "sample-necklace-1",
        productName: "Royal Kundan Gold Necklace",
        category: "necklaces",
        quantity: 1,
        price: 165000,
      },
    ],
    totalAmount: 165000,
    status: "shipped",
    notes: "Express insured courier delivery.",
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  },
];

function sanitizeOrder(doc) {
  return {
    id: doc._id ? doc._id.toString() : doc.id,
    customerName: doc.customerName,
    customerPhone: doc.customerPhone,
    customerEmail: doc.customerEmail || "",
    customerAddress: doc.customerAddress || "",
    items: doc.items || [],
    totalAmount: doc.totalAmount,
    status: doc.status || "pending",
    notes: doc.notes || "",
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : undefined,
  };
}

async function getAllOrders(req, res) {
  try {
    const conn = await connectToDatabase();
    let dbOrders = [];
    if (conn) {
      const docs = await OrderModel.find({}).sort({ createdAt: -1 }).lean();
      dbOrders = docs.map(sanitizeOrder);
    }

    const orders = dbOrders.length > 0 ? dbOrders : SAMPLE_ORDERS;
    return res.json({ success: true, count: orders.length, orders });
  } catch (error) {
    return res.json({ success: true, count: SAMPLE_ORDERS.length, orders: SAMPLE_ORDERS });
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
    const { status } = req.body;
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

module.exports = {
  getAllOrders,
  createOrder,
  updateOrderStatus,
  deleteOrder,
};
