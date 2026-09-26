const mongoose = require("mongoose");

const giftSettingSchema = new mongoose.Schema({
  packingPrice: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model("GiftSetting", giftSettingSchema);
