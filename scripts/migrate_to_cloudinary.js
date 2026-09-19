require("dotenv").config({ path: "D:/Jewellery/.env" });
const connectToDatabase = require("../src/config/db");
const { uploadBase64ToCloudinary, isCloudinaryConfigured } = require("../src/config/cloudinary");

async function migrateProducts() {
  if (!isCloudinaryConfigured()) {
    console.error("Cloudinary is not configured!");
    process.exit(1);
  }

  console.log("Connecting to MongoDB via app db config...");
  const mongooseInstance = await connectToDatabase();
  if (!mongooseInstance) {
    console.error("Failed to connect to MongoDB!");
    process.exit(1);
  }

  const db = mongooseInstance.connection.db;
  const productsCollection = db.collection("products");

  // Fetch only product IDs first so we never load all 15MB at once!
  const productIds = await productsCollection.find({}, { projection: { _id: 1 } }).toArray();
  console.log(`Found ${productIds.length} products to process one by one.`);

  for (let i = 0; i < productIds.length; i++) {
    const id = productIds[i]._id;
    console.log(`\n--- Fetching Product ${i + 1}/${productIds.length} (ID: ${id}) ---`);
    const p = await productsCollection.findOne({ _id: id });
    if (!p) continue;

    const updateFields = {};

    // 1. Check frontImage
    if (p.frontImage && typeof p.frontImage === "string" && p.frontImage.startsWith("data:image")) {
      const sizeMB = (Buffer.byteLength(p.frontImage, "utf8") / 1024 / 1024).toFixed(2);
      console.log(`  Uploading frontImage (${sizeMB} MB) to Cloudinary...`);
      const url = await uploadBase64ToCloudinary(p.frontImage, "products");
      console.log(`  -> Uploaded! New URL: ${url}`);
      updateFields.frontImage = url;
    } else {
      console.log(`  frontImage clean: ${p.frontImage ? p.frontImage.slice(0, 40) : "empty"}`);
    }

    // 2. Check backImage
    if (p.backImage && typeof p.backImage === "string" && p.backImage.startsWith("data:image")) {
      const sizeMB = (Buffer.byteLength(p.backImage, "utf8") / 1024 / 1024).toFixed(2);
      console.log(`  Uploading backImage (${sizeMB} MB) to Cloudinary...`);
      const url = await uploadBase64ToCloudinary(p.backImage, "products");
      console.log(`  -> Uploaded! New URL: ${url}`);
      updateFields.backImage = url;
    } else {
      console.log(`  backImage clean: ${p.backImage ? p.backImage.slice(0, 40) : "empty"}`);
    }

    // 3. Check modelImage
    if (p.modelImage && typeof p.modelImage === "string" && p.modelImage.startsWith("data:image")) {
      const sizeMB = (Buffer.byteLength(p.modelImage, "utf8") / 1024 / 1024).toFixed(2);
      console.log(`  Uploading modelImage (${sizeMB} MB) to Cloudinary...`);
      const url = await uploadBase64ToCloudinary(p.modelImage, "products");
      console.log(`  -> Uploaded! New URL: ${url}`);
      updateFields.modelImage = url;
    } else {
      console.log(`  modelImage clean: ${p.modelImage ? p.modelImage.slice(0, 40) : "empty"}`);
    }

    if (Object.keys(updateFields).length > 0) {
      console.log(`  Saving Cloudinary URLs to MongoDB for ID=${id}...`);
      await productsCollection.updateOne({ _id: id }, { $set: updateFields });
      console.log(`  Saved!`);
    }
  }

  console.log("\n=========================================");
  console.log("All products successfully migrated to Cloudinary!");
  console.log("=========================================");
  process.exit(0);
}

migrateProducts().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
