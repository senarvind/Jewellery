const express = require("express");
const { getAllGifts, createGift, deleteGift, getPackingPrice, updatePackingPrice } = require("../controllers/giftController");

const router = express.Router();

router.get("/all", getAllGifts);
router.get("/packing-price", getPackingPrice);
router.post("/packing-price", updatePackingPrice);
router.post("/", createGift);
router.delete("/:id", deleteGift);

module.exports = router;
