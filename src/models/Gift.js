const mongoose = require("mongoose");

const giftSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Gift name is required"],
      trim: true,
    },
    image: {
      type: String,
      required: [true, "Gift photo is required"],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Gift", giftSchema);
