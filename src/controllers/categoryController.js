const connectToDatabase = require("../config/db");
const CategoryModel = require("../models/Category");

function toCategory(doc) {
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

async function getAllCategories(req, res) {
  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return res.json({ success: true, categories: [] });
    }
    const docs = await CategoryModel.find({ isActive: true }).sort({ displayOrder: 1, name: 1 }).lean();
    return res.json({ success: true, categories: docs.map(toCategory) });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || "Failed to fetch categories" });
  }
}

async function getCategoryBySlug(req, res) {
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
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || "Failed to fetch category" });
  }
}

async function createCategory(req, res) {
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
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || "Failed to create category" });
  }
}

async function updateCategory(req, res) {
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
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || "Failed to update category" });
  }
}

async function deleteCategory(req, res) {
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
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || "Failed to delete category" });
  }
}

module.exports = {
  getAllCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
};
