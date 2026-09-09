const connectToDatabase = require("../config/db");
const CartModel = require("../models/Cart");

function extractIdentifiers(req) {
  const userId = req.user?.userId;
  const sessionId =
    req.query.sessionId ||
    req.body?.sessionId ||
    req.headers["x-session-id"] ||
    undefined;
  return { userId, sessionId };
}

async function getCart(req, res) {
  try {
    const { userId, sessionId } = extractIdentifiers(req);

    if (!userId && !sessionId) {
      return res.json({ success: true, cart: { items: [] } });
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return res.status(500).json({ success: false, error: "Database connection unavailable" });
    }

    let cart = null;
    if (userId) {
      cart = await CartModel.findOne({ userId }).lean();
    }
    if (!cart && sessionId) {
      cart = await CartModel.findOne({ sessionId }).lean();
    }

    if (!cart) {
      return res.json({ success: true, cart: { items: [] } });
    }

    const formattedCart = {
      id: cart._id ? cart._id.toString() : cart.id,
      userId: cart.userId,
      sessionId: cart.sessionId,
      items: (cart.items || []).map((item) => ({
        productId: item.productId || item.product?.id || "",
        product: item.product,
        quantity: item.quantity || 1,
      })),
      updatedAt: cart.updatedAt,
    };

    return res.json({ success: true, cart: formattedCart });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || "Failed to fetch cart" });
  }
}

async function saveCart(req, res) {
  try {
    const { userId, sessionId } = extractIdentifiers(req);
    const { items } = req.body;

    if (!userId && !sessionId) {
      return res.status(400).json({ success: false, error: "Session or User identification is required" });
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return res.status(500).json({ success: false, error: "Database connection unavailable" });
    }

    const query = {};
    if (userId) {
      query.userId = userId;
    } else {
      query.sessionId = sessionId;
    }

    const cleanItems = (items || []).map((item) => ({
      productId: item.productId || item.product?.id || String(Date.now()),
      product: item.product,
      quantity: Math.max(1, item.quantity || 1),
    }));

    const updatedCart = await CartModel.findOneAndUpdate(
      query,
      {
        $set: {
          ...(userId ? { userId } : {}),
          ...(sessionId ? { sessionId } : {}),
          items: cleanItems,
        },
      },
      { new: true, upsert: true }
    ).lean();

    if (!updatedCart) {
      return res.status(500).json({ success: false, error: "Failed to update cart" });
    }

    const formattedCart = {
      id: updatedCart._id ? updatedCart._id.toString() : updatedCart.id,
      userId: updatedCart.userId,
      sessionId: updatedCart.sessionId,
      items: updatedCart.items || [],
      updatedAt: updatedCart.updatedAt,
    };

    return res.json({ success: true, cart: formattedCart });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || "Failed to save cart" });
  }
}

async function clearCart(req, res) {
  try {
    const { userId, sessionId } = extractIdentifiers(req);

    if (!userId && !sessionId) {
      return res.json({ success: true, message: "Cart cleared" });
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return res.status(500).json({ success: false, error: "Database connection unavailable" });
    }

    const query = {};
    if (userId) query.userId = userId;
    else query.sessionId = sessionId;

    await CartModel.findOneAndUpdate(query, { $set: { items: [] } });

    return res.json({ success: true, message: "Cart cleared in database" });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || "Failed to clear cart" });
  }
}

module.exports = {
  getCart,
  saveCart,
  clearCart,
};
