import { Router } from "express";
import {
  getAllProducts,
  getProductsByCategory,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkCreateProducts,
} from "../controllers/productController";

const router = Router();

router.get("/", getAllProducts);
router.get("/category/:slug", getProductsByCategory);
router.get("/:id", getProductById);
router.post("/", createProduct);
router.post("/bulk", bulkCreateProducts);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);
router.delete("/", deleteProduct);

export default router;
