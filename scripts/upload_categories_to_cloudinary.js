require("dotenv").config({ path: "D:/Jewellery/.env" });
const path = require("path");
const fs = require("fs");
const { cloudinary, isCloudinaryConfigured } = require("../src/config/cloudinary");

async function uploadCategoryAssets() {
  if (!isCloudinaryConfigured()) {
    console.error("Cloudinary not configured");
    return;
  }

  const publicDir = "D:/kesharjewellers/public";
  const filesToUpload = [
    { key: "necklace", file: "images/categories/Necklace.png" },
    { key: "earrings", file: "images/categories/earrings.png" },
    { key: "bangels", file: "images/categories/bangels.png" },
    { key: "ring", file: "images/categories/ring.png" },
    { key: "mangalsutra", file: "images/categories/Mangalsutra.png" },
    { key: "chains", file: "images/categories/07-chains.jpg" },
    { key: "pendants", file: "images/categories/08-pendants.jpg" },
    { key: "nosepins", file: "images/categories/nosepins.jpg" },
    { key: "maangtikka", file: "images/categories/maangtka.png" },
    { key: "banner", file: "images/Banner.png" },
    { key: "whatsappBanner", file: "images/whatsapp.jpeg" },
  ];

  const results = {};

  for (const item of filesToUpload) {
    const fullPath = path.join(publicDir, item.file);
    if (!fs.existsSync(fullPath)) {
      console.log(`File not found: ${fullPath}`);
      continue;
    }

    console.log(`Uploading ${item.file} to Cloudinary...`);
    const res = await cloudinary.uploader.upload(fullPath, {
      folder: "keshar-categories",
      use_filename: true,
      unique_filename: false,
    });

    console.log(`  -> Uploaded! ${res.secure_url}`);
    results[item.key] = res.secure_url;
  }

  console.log("\n=== CLOUDINARY URLS ===");
  console.log(JSON.stringify(results, null, 2));
}

uploadCategoryAssets().catch(console.error);
