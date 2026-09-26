const Gift = require("../models/Gift");
const GiftSetting = require("../models/GiftSetting");

// @desc    Get all gifts
// @route   GET /api/gifts/all
// @access  Public
exports.getAllGifts = async (req, res) => {
  try {
    const gifts = await Gift.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: gifts });
  } catch (error) {
    console.error("Error fetching gifts:", error);
    res.status(500).json({ success: false, message: "Server error while fetching gifts" });
  }
};

// @desc    Create a gift
// @route   POST /api/gifts
// @access  Private/Admin
exports.createGift = async (req, res) => {
  try {
    const { name, image } = req.body;

    if (!name || !image) {
      return res.status(400).json({ success: false, message: "Name and image are required" });
    }

    const gift = await Gift.create({ name, image });
    res.status(201).json({ success: true, data: gift });
  } catch (error) {
    console.error("Error creating gift:", error);
    res.status(500).json({ success: false, message: "Server error while creating gift" });
  }
};

// @desc    Delete a gift
// @route   DELETE /api/gifts/:id
// @access  Private/Admin
exports.deleteGift = async (req, res) => {
  try {
    const gift = await Gift.findById(req.params.id);

    if (!gift) {
      return res.status(404).json({ success: false, message: "Gift not found" });
    }

    await gift.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    console.error("Error deleting gift:", error);
    res.status(500).json({ success: false, message: "Server error while deleting gift" });
  }
};

// @desc    Get gift packing price
// @route   GET /api/gifts/packing-price
exports.getPackingPrice = async (req, res) => {
  try {
    let setting = await GiftSetting.findOne();
    if (!setting) {
      setting = await GiftSetting.create({ packingPrice: 0 });
    }
    res.status(200).json({ success: true, packingPrice: setting.packingPrice });
  } catch (error) {
    console.error("Error fetching packing price:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Update gift packing price
// @route   POST /api/gifts/packing-price
exports.updatePackingPrice = async (req, res) => {
  try {
    const { packingPrice } = req.body;
    let setting = await GiftSetting.findOne();
    if (!setting) {
      setting = await GiftSetting.create({ packingPrice: Number(packingPrice) || 0 });
    } else {
      setting.packingPrice = Number(packingPrice) || 0;
      await setting.save();
    }
    res.status(200).json({ success: true, packingPrice: setting.packingPrice });
  } catch (error) {
    console.error("Error updating packing price:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
