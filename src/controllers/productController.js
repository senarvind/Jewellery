const mongoose = require("mongoose");
const connectToDatabase = require("../config/db");
const ProductModel = require("../models/Product");

const SAMPLE_PRODUCTS = [
  {
    id: "sample-ring-1",
    category: "rings",
    productType: "22K Gold Solitaire Ring",
    description: "Exquisite 22K Hallmark Gold Ring crafted with precision and classic elegance.",
    material: "22K Gold",
    dimensionL: "20mm",
    dimensionW: "18mm",
    dimensionH: "5mm",
    weight: "3.5g",
    sellingPrice: 24999,
    mrp: 28999,
    frontImage: "/images/categories/ring.png",
    backImage: "/images/categories/ring.png",
    modelImage: "/images/categories/ring.png",
    createdAt: new Date().toISOString(),
  },
  {
    id: "sample-ring-2",
    category: "rings",
    productType: "925 Sterling Silver Ring",
    description: "Royal 92.5 Sterling Silver Band with cubic zirconia stones.",
    material: "92.5 Silver",
    dimensionL: "19mm",
    dimensionW: "17mm",
    dimensionH: "4mm",
    weight: "2.8g",
    sellingPrice: 3499,
    mrp: 4499,
    frontImage: "/images/categories/ring.png",
    backImage: "/images/categories/ring.png",
    modelImage: "/images/categories/ring.png",
    createdAt: new Date().toISOString(),
  },
  {
    id: "sample-necklace-1",
    category: "necklaces",
    productType: "Royal Kundan Gold Necklace",
    description: "Handcrafted 22K Gold Traditional Bridal Kundan Necklace Set.",
    material: "22K Gold",
    dimensionL: "180mm",
    dimensionW: "120mm",
    dimensionH: "15mm",
    weight: "24.5g",
    sellingPrice: 165000,
    mrp: 185000,
    frontImage: "/images/categories/Necklace.png",
    backImage: "/images/categories/Necklace.png",
    modelImage: "/images/categories/Necklace.png",
    createdAt: new Date().toISOString(),
  },
  {
    id: "sample-earring-1",
    category: "earrings",
    productType: "Traditional Gold Jhumka",
    description: "Authentic 22K Gold Jhumka Earrings with intricate Meenakari detail.",
    material: "22K Gold",
    dimensionL: "45mm",
    dimensionW: "22mm",
    dimensionH: "22mm",
    weight: "8.2g",
    sellingPrice: 58999,
    mrp: 64999,
    frontImage: "/images/categories/earrings.png",
    backImage: "/images/categories/earrings.png",
    modelImage: "/images/categories/earrings.png",
    createdAt: new Date().toISOString(),
  },
  {
    id: "sample-bangle-1",
    category: "bangles",
    productType: "22K Gold Floral Bangle",
    description: "Set of 2 Premium 22K Hallmark Gold Floral Carved Bangles.",
    material: "22K Gold",
    dimensionL: "60mm",
    dimensionW: "60mm",
    dimensionH: "10mm",
    weight: "18.5g",
    sellingPrice: 128000,
    mrp: 142000,
    frontImage: "/images/categories/bangels.png",
    backImage: "/images/categories/bangels.png",
    modelImage: "/images/categories/bangels.png",
    createdAt: new Date().toISOString(),
  },
];

function toProduct(doc) {
  return {
    id: doc._id ? doc._id.toString() : doc.id,
    category: doc.category,
    productType: doc.productType,
    description: doc.description,
    material: doc.material,
    dimensionL: doc.dimensionL ?? "",
    dimensionW: doc.dimensionW ?? "",
    dimensionH: doc.dimensionH ?? "",
    weight: doc.weight,
    sellingPrice: doc.sellingPrice,
    mrp: doc.mrp,
    frontImage: doc.frontImage ?? "",
    backImage: doc.backImage ?? "",
    modelImage: doc.modelImage ?? "",
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : undefined,
  };
}

async function getAllProducts(req, res) {
  try {
    const conn = await connectToDatabase();
    let dbProducts = [];
    if (conn) {
      const docs = await ProductModel.find({}).sort({ createdAt: -1 }).lean();
      dbProducts = docs.map(toProduct);
    }
    const combined = [...dbProducts, ...SAMPLE_PRODUCTS];
    return res.json({ success: true, count: combined.length, products: combined });
  } catch (error) {
    console.error("Error in getAllProducts:", error);
    return res.json({ success: true, count: SAMPLE_PRODUCTS.length, products: SAMPLE_PRODUCTS });
  }
}

async function getProductsByCategory(req, res) {
  try {
    const categorySlug = (req.params.slug || req.query.category || "").toString();
    const normalizedSlug = categorySlug.toLowerCase().trim().replace(/s$/, "");
    const conn = await connectToDatabase();
    let dbProducts = [];

    if (conn && categorySlug) {
      const docs = await ProductModel.find({
        category: { $regex: new RegExp(categorySlug, "i") },
      }).sort({ createdAt: -1 }).lean();
      dbProducts = docs.map(toProduct);
    }

    const filteredSamples = SAMPLE_PRODUCTS.filter(
      (p) =>
        p.category.toLowerCase().includes(normalizedSlug) ||
        normalizedSlug.includes(p.category.toLowerCase()) ||
        p.productType.toLowerCase().includes(normalizedSlug)
    );

    const combined = [...dbProducts, ...filteredSamples];
    return res.json({
      success: true,
      count: combined.length,
      products: combined.length > 0 ? combined : SAMPLE_PRODUCTS,
    });
  } catch (error) {
    console.error("Error in getProductsByCategory:", error);
    return res.json({ success: true, count: SAMPLE_PRODUCTS.length, products: SAMPLE_PRODUCTS });
  }
}

async function getProductById(req, res) {
  try {
    const { id } = req.params;
    const conn = await connectToDatabase();

    if (conn && mongoose.Types.ObjectId.isValid(id)) {
      const doc = await ProductModel.findById(id).lean();
      if (doc) {
        return res.json({ success: true, product: toProduct(doc) });
      }
    }

    const sample = SAMPLE_PRODUCTS.find((p) => p.id === id || p.id.includes(id));
    if (sample) {
      return res.json({ success: true, product: sample });
    }

    return res.json({ success: true, product: SAMPLE_PRODUCTS[0] });
  } catch (error) {
    console.error("Error in getProductById:", error);
    return res.json({ success: true, product: SAMPLE_PRODUCTS[0] });
  }
}

async function createProduct(req, res) {
  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return res.status(500).json({ success: false, error: "Database connection unavailable" });
    }

    const { id, ...data } = req.body;
    const newDoc = await ProductModel.create(data);

    return res.status(201).json({
      success: true,
      message: "Product created successfully! 💎",
      product: toProduct(newDoc),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || "Failed to create product" });
  }
}

async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const conn = await connectToDatabase();
    if (!conn) {
      return res.status(500).json({ success: false, error: "Database connection unavailable" });
    }

    const updatedDoc = await ProductModel.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updatedDoc) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }

    return res.json({
      success: true,
      message: "Product updated successfully! ✨",
      product: toProduct(updatedDoc),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || "Failed to update product" });
  }
}

async function deleteProduct(req, res) {
  try {
    const id = req.params.id || req.query.id;
    if (!id) {
      return res.status(400).json({ success: false, error: "Product ID is required" });
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return res.status(500).json({ success: false, error: "Database connection unavailable" });
    }

    const deleted = await ProductModel.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }

    return res.json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || "Failed to delete product" });
  }
}

async function bulkCreateProducts(req, res) {
  try {
    const { products } = req.body;
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ success: false, error: "Array of products is required" });
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return res.status(500).json({ success: false, error: "Database connection unavailable" });
    }

    const cleaned = products.map(({ id, ...rest }) => rest);
    const result = await ProductModel.insertMany(cleaned);

    return res.status(201).json({
      success: true,
      message: `Successfully imported ${result.length} products! 💎`,
      count: result.length,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || "Failed to import products" });
  }
}

module.exports = {
  SAMPLE_PRODUCTS,
  getAllProducts,
  getProductsByCategory,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkCreateProducts,
};
