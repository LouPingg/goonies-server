import mongoose from "mongoose";

const GallerySchema = new mongoose.Schema(
  {
    url: { type: String, required: true }, // URL Cloudinary ou externe
    caption: { type: String, default: "" },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Gallery", GallerySchema);
