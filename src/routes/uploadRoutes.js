const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  isCloudinaryConfigured,
  uploadToCloudinary,
  deleteFromCloudinary,
} = require("../config/cloudinary");

const uploadDir = path.join(process.cwd(), "uploads", "products");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Memory storage to process files directly in memory
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

const router = express.Router();

/**
 * POST /api/upload
 * Accepts single file (supports 'file' or 'image' form fields)
 */
router.post("/", upload.any(), async (req, res) => {
  try {
    const file = req.files && req.files.length > 0 ? req.files[0] : null;
    if (!file) {
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }

    const folder = req.body.folder || "products";

    if (isCloudinaryConfigured()) {
      // Upload directly to Cloudinary
      const result = await uploadToCloudinary(file.buffer, folder);
      return res.json({
        success: true,
        url: result.secure_url,
        public_id: result.public_id,
        fileName: file.originalname,
        storage: "cloudinary",
      });
    } else {
      // Fallback: Save locally if Cloudinary env is missing
      const sanitizedName = file.originalname
        .toLowerCase()
        .replace(/[^a-z0-9.]/g, "-")
        .replace(/-+/g, "-");
      const uniqueFileName = `${Date.now()}-${sanitizedName}`;
      const filePath = path.join(uploadDir, uniqueFileName);

      fs.writeFileSync(filePath, file.buffer);

      const publicUrl = `/uploads/products/${uniqueFileName}`;

      return res.json({
        success: true,
        url: publicUrl,
        fileName: uniqueFileName,
        storage: "local",
      });
    }
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ success: false, error: error.message || "Upload failed" });
  }
});

/**
 * POST /api/upload/multiple
 * Accepts multiple files ('images' or 'files')
 */
router.post("/multiple", upload.any(), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: "No files uploaded" });
    }

    const folder = req.body.folder || "products";
    const uploadedFiles = [];

    for (const file of req.files) {
      if (isCloudinaryConfigured()) {
        const result = await uploadToCloudinary(file.buffer, folder);
        uploadedFiles.push({
          url: result.secure_url,
          public_id: result.public_id,
          fileName: file.originalname,
          storage: "cloudinary",
        });
      } else {
        const sanitizedName = file.originalname
          .toLowerCase()
          .replace(/[^a-z0-9.]/g, "-")
          .replace(/-+/g, "-");
        const uniqueFileName = `${Date.now()}-${sanitizedName}`;
        const filePath = path.join(uploadDir, uniqueFileName);

        fs.writeFileSync(filePath, file.buffer);

        uploadedFiles.push({
          url: `/uploads/products/${uniqueFileName}`,
          fileName: uniqueFileName,
          storage: "local",
        });
      }
    }

    return res.json({
      success: true,
      files: uploadedFiles,
    });
  } catch (error) {
    console.error("Multiple upload error:", error);
    return res.status(500).json({ success: false, error: error.message || "Upload failed" });
  }
});

/**
 * DELETE /api/upload/:publicId
 * Deletes image from Cloudinary by public_id
 */
router.delete("/:publicId", async (req, res) => {
  try {
    const { publicId } = req.params;
    if (!isCloudinaryConfigured()) {
      return res.status(400).json({
        success: false,
        error: "Cloudinary is not configured on backend",
      });
    }

    const result = await deleteFromCloudinary(publicId);
    return res.json({ success: true, result });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
