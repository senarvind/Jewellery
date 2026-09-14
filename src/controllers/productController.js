const mongoose = require("mongoose");
const connectToDatabase = require("../config/db");
const ProductModel = require("../models/Product");
const { uploadBase64ToCloudinary } = require("../config/cloudinary");


function toProduct(doc) {
  return {
    id: doc._id ? doc._id.toString() : doc.id,
    category: doc.category || "",
    productType: doc.productType || "",
    description: doc.description || "",
    material: doc.material || "",
    dimensionL: doc.dimensionL ?? "",
    dimensionW: doc.dimensionW ?? "",
    dimensionH: doc.dimensionH ?? "",
    weight: doc.weight || "",
    sellingPrice: doc.sellingPrice || 0,
    mrp: doc.mrp || 0,
    stock: typeof doc.stock === "number" ? doc.stock : 10,
    frontImage: doc.frontImage ?? "",
    backImage: doc.backImage ?? "",
    modelImage: doc.modelImage ?? "",
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
  };
}

async function getAllProducts(req, res) {
  try {
    const conn = await connectToDatabase();
    if (conn) {
      const docs = await ProductModel.find({}).sort({ createdAt: -1 }).lean();
      const dbProducts = docs.map(toProduct);
      return res.json({ success: true, count: dbProducts.length, products: dbProducts });
    }
    return res.json({ success: true, count: 0, products: [] });
  } catch (error) {
    console.error("Error in getAllProducts:", error);
    return res.status(500).json({ success: false, error: error.message, products: [] });
  }
}

async function getProductsByCategory(req, res) {
  try {
    const categorySlug = (req.params.slug || req.query.category || "").toString();
    const cleanSlug = categorySlug.toLowerCase().trim();
    const normalizedSlug = cleanSlug.replace(/[^a-z0-9]/g, "");
    const conn = await connectToDatabase();
    let dbProducts = [];

    if (conn && cleanSlug) {
      if (cleanSlug === "all" || cleanSlug === "all-products") {
        const docs = await ProductModel.find({}).sort({ createdAt: -1 }).lean();
        dbProducts = docs.map(toProduct);
      } else if (cleanSlug === "new-arrival" || cleanSlug === "new-arrivals") {
        const docs = await ProductModel.find({}).sort({ createdAt: -1 }).limit(30).lean();
        dbProducts = docs.map(toProduct);
      } else if (cleanSlug === "bestsellers" || cleanSlug === "bestseller") {
        const docs = await ProductModel.find({}).sort({ sellingPrice: -1 }).limit(30).lean();
        dbProducts = docs.map(toProduct);
      } else {
        const flexPattern = cleanSlug.replace(/[-\s]+/g, "[-\\s]?");
        const singularSlug = cleanSlug.replace(/(?:es|s)$/i, "");
        const singularFlex = singularSlug.replace(/[-\s]+/g, "[-\\s]?");

        const docs = await ProductModel.find({
          $or: [
            { category: { $regex: new RegExp(flexPattern, "i") } },
            { category: { $regex: new RegExp(singularFlex, "i") } },
            { category: { $regex: new RegExp(cleanSlug, "i") } },
            { category: { $regex: new RegExp(normalizedSlug, "i") } },
            { productType: { $regex: new RegExp(singularFlex, "i") } },
          ],
        }).sort({ createdAt: -1 }).lean();

        dbProducts = docs.map(toProduct);
      }

      return res.json({
        success: true,
        count: dbProducts.length,
        products: dbProducts,
      });
    }

    return res.json({
      success: true,
      count: 0,
      products: [],
    });
  } catch (error) {
    console.error("Error in getProductsByCategory:", error);
    return res.status(500).json({ success: false, error: error.message, products: [] });
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

    return res.status(404).json({ success: false, error: "Product not found" });
  } catch (error) {
    console.error("Error in getProductById:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function createProduct(req, res) {
  try {
    const conn = await connectToDatabase();
    const { id, ...data } = req.body;

    let frontImage = String(data.frontImage || "/images/categories/ring.png").trim();
    let backImage = String(data.backImage || "/images/categories/ring.png").trim();
    let modelImage = String(data.modelImage || "/images/categories/ring.png").trim();

    if (frontImage.startsWith("data:image")) {
      frontImage = await uploadBase64ToCloudinary(frontImage, "products");
    }
    if (backImage.startsWith("data:image")) {
      backImage = await uploadBase64ToCloudinary(backImage, "products");
    }
    if (modelImage.startsWith("data:image")) {
      modelImage = await uploadBase64ToCloudinary(modelImage, "products");
    }

    // Smart defaults to prevent Mongoose validation failures
    const formattedData = {
      ...data,
      category: String(data.category || "nose-pins").toLowerCase().trim(),
      productType: String(data.productType || "Jewellery Item").trim(),
      description: String(data.description || "").trim() || `${data.productType || "Jewellery Item"} - Authentic Hallmark Certified Collection from Keshar Jewellers`,
      material: String(data.material || "92.50 % silver").trim(),
      weight: String(data.weight || "1.0g").trim(),
      sellingPrice: Number(data.sellingPrice) || 0,
      mrp: Number(data.mrp) || Number(data.sellingPrice) || 0,
      stock: Number(data.stock) || 10,
      frontImage,
      backImage,
      modelImage,
    };

    if (conn) {
      const newDoc = await ProductModel.create(formattedData);
      return res.status(201).json({
        success: true,
        message: "Product created successfully! 💎",
        product: toProduct(newDoc),
      });
    }

    return res.status(500).json({ success: false, error: "Database connection failed. Please ensure MongoDB is connected." });
  } catch (error) {
    console.error("Failed to create product:", error);
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

    if (req.body.frontImage && req.body.frontImage.startsWith("data:image")) {
      req.body.frontImage = await uploadBase64ToCloudinary(req.body.frontImage, "products");
    }
    if (req.body.backImage && req.body.backImage.startsWith("data:image")) {
      req.body.backImage = await uploadBase64ToCloudinary(req.body.backImage, "products");
    }
    if (req.body.modelImage && req.body.modelImage.startsWith("data:image")) {
      req.body.modelImage = await uploadBase64ToCloudinary(req.body.modelImage, "products");
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

    const cleaned = await Promise.all(
      products.map(async ({ id, ...rest }) => {
        let frontImage = rest.frontImage || "";
        let backImage = rest.backImage || "";
        let modelImage = rest.modelImage || "";
        if (frontImage.startsWith("data:image")) {
          frontImage = await uploadBase64ToCloudinary(frontImage, "products");
        }
        if (backImage.startsWith("data:image")) {
          backImage = await uploadBase64ToCloudinary(backImage, "products");
        }
        if (modelImage.startsWith("data:image")) {
          modelImage = await uploadBase64ToCloudinary(modelImage, "products");
        }
        return {
          ...rest,
          frontImage,
          backImage,
          modelImage,
        };
      })
    );
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
  getAllProducts,
  getProductsByCategory,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkCreateProducts,
};
