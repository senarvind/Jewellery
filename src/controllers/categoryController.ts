import { Request, Response } from "express";
import connectToDatabase from "../config/db";
import CategoryModel from "../models/Category";

function toCategory(doc: any) {
  return {
    id: doc._id.toString(),
    name: doc.name,
    slug: doc.slug,
    description: doc.description || "",
    imageUrl: doc.imageUrl || "",
    displayOrder: doc.displayOrder || 0,
    isActive: doc.isActive !== false,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : undefined,
  };
}

export async function getAllCategories(req: Request, res: Response) {
  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return res.json({ success: true, categories: [] });
    }
    const docs = await CategoryModel.find({ isActive: true }).sort({ displayOrder: 1, name: 1 }).lean();
    return res.json({ success: true, categories: docs.map(toCategory) });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Failed to fetch categories" });
  }
}

export async function getCategoryBySlug(req: Request, res: Response) {
  try {
    const slug = req.params.slug;
    const conn = await connectToDatabase();
    if (!conn) {
      return res.status(500).json({ success: false, error: "Database connection unavailable" });
    }

    const doc = await CategoryModel.findOne({ slug: slug.toLowerCase().trim() }).lean();
    if (!doc) {
      return res.status(404).json({ success: false, error: "Category not found" });
    }

    return res.json({ success: true, category: toCategory(doc) });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Failed to fetch category" });
  }
}

export async function createCategory(req: Request, res: Response) {
  try {
    const { name, description, imageUrl, displayOrder, isActive } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: "Category name is required" });
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return res.status(500).json({ success: false, error: "Database connection unavailable" });
    }

    const slug = (req.body.slug || name).toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    const newDoc = await CategoryModel.create({
      name,
      slug,
      description: description || "",
      imageUrl: imageUrl || "",
      displayOrder: displayOrder || 0,
      isActive: isActive !== false,
    });

    return res.status(201).json({ success: true, category: toCategory(newDoc) });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Failed to create category" });
  }
}

export async function updateCategory(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const conn = await connectToDatabase();
    if (!conn) {
      return res.status(500).json({ success: false, error: "Database connection unavailable" });
    }

    const data = { ...req.body };
    if (data.name && !data.slug) {
      data.slug = data.name.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    }

    const updated = await CategoryModel.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
    if (!updated) {
      return res.status(404).json({ success: false, error: "Category not found" });
    }

    return res.json({ success: true, category: toCategory(updated) });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Failed to update category" });
  }
}

export async function deleteCategory(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const conn = await connectToDatabase();
    if (!conn) {
      return res.status(500).json({ success: false, error: "Database connection unavailable" });
    }

    const deleted = await CategoryModel.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: "Category not found" });
    }

    return res.json({ success: true, message: "Category deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Failed to delete category" });
  }
}
