import mongoose from "mongoose";
import dns from "dns";

// Fix Node.js DNS SRV lookup issues on Windows
try {
  if (typeof dns.setDefaultResultOrder === "function") {
    dns.setDefaultResultOrder("ipv4first");
  }
  dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4", "4.2.2.2"]);
} catch {
  // Ignore if restricted
}

let isConnected = false;

export async function connectToDatabase(): Promise<typeof mongoose | null> {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    console.warn("⚠️ MONGODB_URI is not set in environment variables.");
    return null;
  }

  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose;
  }

  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      family: 4,
    });
    isConnected = true;
    console.log("✅ MongoDB connected successfully!");
    return conn;
  } catch (error) {
    isConnected = false;
    console.error("❌ MongoDB connection error:", error);
    return null;
  }
}

export default connectToDatabase;
