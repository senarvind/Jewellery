const cloudinary = require("cloudinary").v2;

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: (process.env.CLOUDINARY_CLOUD_NAME || "").trim(),
  api_key: (process.env.CLOUDINARY_API_KEY || "").trim(),
  api_secret: (process.env.CLOUDINARY_API_SECRET || "").trim(),
});

/**
 * Helper to check if Cloudinary is properly configured in env variables
 */
const isCloudinaryConfigured = () => {
  const cName = (process.env.CLOUDINARY_CLOUD_NAME || "").trim();
  const aKey = (process.env.CLOUDINARY_API_KEY || "").trim();
  const aSecret = (process.env.CLOUDINARY_API_SECRET || "").trim();

  return Boolean(
    cName &&
      cName !== "your_cloud_name" &&
      aKey &&
      aKey !== "your_api_key" &&
      aSecret &&
      aSecret !== "your_api_secret"
  );
};

/**
 * Upload a buffer directly to Cloudinary using upload_stream
 * @param {Buffer} fileBuffer - Buffer from Multer memory storage
 * @param {string} folder - Target folder in Cloudinary (default: "products")
 * @returns {Promise<Object>} Cloudinary upload response
 */
const uploadToCloudinary = (fileBuffer, folder = "products") => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: "auto",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

/**
 * Upload base64 string directly to Cloudinary
 * @param {string} base64Data - base64 image string or URL
 * @param {string} folder - Target folder in Cloudinary
 * @returns {Promise<string>} Uploaded Cloudinary secure_url or original string
 */
const uploadBase64ToCloudinary = async (base64Data, folder = "products") => {
  if (!base64Data || typeof base64Data !== "string") return base64Data;
  if (!base64Data.startsWith("data:image")) return base64Data;
  if (!isCloudinaryConfigured()) return base64Data;

  try {
    const result = await cloudinary.uploader.upload(base64Data, {
      folder: folder,
      resource_type: "auto",
    });
    return result.secure_url;
  } catch (err) {
    console.error("Cloudinary base64 upload error:", err);
    throw new Error("Failed to upload image to Cloudinary. Please check your credentials.");
  }
};

/**
 * Delete image from Cloudinary by public_id
 * @param {string} publicId 
 * @returns {Promise<Object>}
 */
const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return null;
  return await cloudinary.uploader.destroy(publicId);
};

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
  uploadToCloudinary,
  uploadBase64ToCloudinary,
  deleteFromCloudinary,
};
