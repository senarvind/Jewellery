import { Router, Request, Response } from "express";
import mongoose from "mongoose";

const router = Router();

router.get("/", (req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? "connected" : dbState === 2 ? "connecting" : "disconnected";

  return res.json({
    success: true,
    status: "ok",
    message: "Keshar Jewellers Express Backend API is running! 💎",
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
      readyState: dbState,
    },
  });
});

export default router;
