import { Response } from "express";
import connectToDatabase from "../config/db";
import CartModel from "../models/Cart";
import { AuthRequest } from "../middleware/authMiddleware";

function extractIdentifiers(req: AuthRequest) {
  const userId = req.user?.userId;
  const sessionId =
    (req.query.sessionId as string) ||
    req.body?.sessionId ||
    (req.headers["x-session-id"] as string) ||
    undefined;
  return { userId, sessionId };
}

export async function getCart(req: AuthRequest, res: Response) {
  try {
    const { userId, sessionId } = extractIdentifiers(req);

    if (!userId && !sessionId) {
      return res.json({ success: true, cart: { items: [] } });
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return res.status(500).json({ success: false, error: "Database connection unavailable" });
    }

    let cart: any = null;
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
      items: (cart.items || []).map((item: any) => ({
        productId: item.productId || item.product?.id || "",
        product: item.product,
        quantity: item.quantity || 1,
      })),
      updatedAt: cart.updatedAt,
    };

    return res.json({ success: true, cart: formattedCart });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Failed to fetch cart" });
  }
}

export async function saveCart(req: AuthRequest, res: Response) {
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

    const query: Record<string, any> = {};
    if (userId) {
      query.userId = userId;
    } else {
      query.sessionId = sessionId;
    }

    const cleanItems = (items || []).map((item: any) => ({
      productId: item.productId || item.product?.id || String(Date.now()),
      product: item.product,
      quantity: Math.max(1, item.quantity || 1),
    }));

    const updatedCart: any = await CartModel.findOneAndUpdate(
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
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Failed to save cart" });
  }
}

export async function clearCart(req: AuthRequest, res: Response) {
  try {
    const { userId, sessionId } = extractIdentifiers(req);

    if (!userId && !sessionId) {
      return res.json({ success: true, message: "Cart cleared" });
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return res.status(500).json({ success: false, error: "Database connection unavailable" });
    }

    const query: Record<string, any> = {};
    if (userId) query.userId = userId;
    else query.sessionId = sessionId;

    await CartModel.findOneAndUpdate(query, { $set: { items: [] } });

    return res.json({ success: true, message: "Cart cleared in database" });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Failed to clear cart" });
  }
}
