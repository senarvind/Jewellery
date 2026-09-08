import mongoose, { Schema, Document } from "mongoose";

export interface IProduct extends Document {
  category: string;
  productType: string;
  description: string;
  material: string;
  dimensionL: string;
  dimensionW: string;
  dimensionH: string;
  weight: string;
  sellingPrice: number;
  mrp: number;
  frontImage: string;
  backImage: string;
  modelImage: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    category:     { type: String, required: true, index: true },
    productType:  { type: String, required: true },
    description:  { type: String, required: true },
    material:     { type: String, required: true },
    dimensionL:   { type: String, default: "" },
    dimensionW:   { type: String, default: "" },
    dimensionH:   { type: String, default: "" },
    weight:       { type: String, required: true },
    sellingPrice: { type: Number, required: true },
    mrp:          { type: Number, required: true },
    frontImage:   { type: String, default: "" },
    backImage:    { type: String, default: "" },
    modelImage:   { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

const Product =
  mongoose.models.Product ||
  mongoose.model<IProduct>("Product", ProductSchema);

export default Product;
