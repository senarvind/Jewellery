const express = require("express");
const {
  getAllProducts,
  getProductsByCategory,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkCreateProducts,
} = require("../controllers/productController");

const router = express.Router();

router.get("/", getAllProducts);
router.get("/category/:slug", getProductsByCategory);
router.get("/:id", getProductById);
router.post("/", createProduct);
router.post("/bulk", bulkCreateProducts);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);
router.delete("/", deleteProduct);

module.exports = router;
