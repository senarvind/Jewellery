import { Response } from "express";
import connectToDatabase from "../config/db";
import WishlistModel from "../models/Wishlist";
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

export async function getWishlist(req: AuthRequest, res: Response) {
  try {
    const { userId, sessionId } = extractIdentifiers(req);

    if (!userId && !sessionId) {
      return res.json({ success: true, wishlist: { items: [] } });
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return res.status(500).json({ success: false, error: "Database connection unavailable" });
    }

    let wishlist: any = null;
    if (userId) {
      wishlist = await WishlistModel.findOne({ userId }).lean();
    }
    if (!wishlist && sessionId) {
      wishlist = await WishlistModel.findOne({ sessionId }).lean();
    }

    if (!wishlist) {
      return res.json({ success: true, wishlist: { items: [] } });
    }

    const formattedWishlist = {
      id: wishlist._id ? wishlist._id.toString() : wishlist.id,
      userId: wishlist.userId,
      sessionId: wishlist.sessionId,
      items: (wishlist.items || []).map((item: any) => ({
        productId: item.productId || item.product?.id || "",
        product: item.product,
      })),
      updatedAt: wishlist.updatedAt,
    };

    return res.json({ success: true, wishlist: formattedWishlist });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Failed to fetch wishlist" });
  }
}

export async function saveWishlist(req: AuthRequest, res: Response) {
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
    }));

    const updatedWishlist: any = await WishlistModel.findOneAndUpdate(
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

    if (!updatedWishlist) {
      return res.status(500).json({ success: false, error: "Failed to update wishlist" });
    }

    const formattedWishlist = {
      id: updatedWishlist._id ? updatedWishlist._id.toString() : updatedWishlist.id,
      userId: updatedWishlist.userId,
      sessionId: updatedWishlist.sessionId,
      items: updatedWishlist.items || [],
      updatedAt: updatedWishlist.updatedAt,
    };

    return res.json({ success: true, wishlist: formattedWishlist });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Failed to save wishlist" });
  }
}

export async function toggleWishlistItem(req: AuthRequest, res: Response) {
  try {
    const { userId, sessionId } = extractIdentifiers(req);
    const { product } = req.body;

    if (!product || !product.id) {
      return res.status(400).json({ success: false, error: "Product information is required" });
    }

    if (!userId && !sessionId) {
      return res.status(400).json({ success: false, error: "Session or User identification is required" });
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return res.status(500).json({ success: false, error: "Database connection unavailable" });
    }

    const query: Record<string, any> = {};
    if (userId) query.userId = userId;
    else query.sessionId = sessionId;

    let wishlist: any = await WishlistModel.findOne(query);
    if (!wishlist) {
      wishlist = new WishlistModel({
        userId,
        sessionId,
        items: [{ productId: product.id, product }],
      });
      await wishlist.save();
    } else {
      const existingIndex = (wishlist.items || []).findIndex(
        (item: any) => item.productId === product.id || item.product?.id === product.id
      );

      if (existingIndex > -1) {
        // Remove item
        wishlist.items.splice(existingIndex, 1);
      } else {
        // Add item
        wishlist.items.push({ productId: product.id, product });
      }
      await wishlist.save();
    }

    const formattedWishlist = {
      id: wishlist._id.toString(),
      userId: wishlist.userId,
      sessionId: wishlist.sessionId,
      items: (wishlist.items || []).map((item: any) => ({
        productId: item.productId || item.product?.id || "",
        product: item.product,
      })),
      updatedAt: wishlist.updatedAt,
    };

    return res.json({ success: true, wishlist: formattedWishlist });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Failed to toggle wishlist item" });
  }
}

export async function clearWishlist(req: AuthRequest, res: Response) {
  try {
    const { userId, sessionId } = extractIdentifiers(req);

    if (!userId && !sessionId) {
      return res.json({ success: true, message: "Wishlist cleared" });
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return res.status(500).json({ success: false, error: "Database connection unavailable" });
    }

    const query: Record<string, any> = {};
    if (userId) query.userId = userId;
    else query.sessionId = sessionId;

    await WishlistModel.findOneAndUpdate(query, { $set: { items: [] } });

    return res.json({ success: true, message: "Wishlist cleared in database" });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Failed to clear wishlist" });
  }
}
