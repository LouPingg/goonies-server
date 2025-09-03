import { Router } from "express";
import multer from "multer";
import { auth } from "../middleware/auth.js";
import Gallery from "../models/Gallery.js";
import { uploadBufferToCloudinary } from "../utils/cloudinary.js";

const r = Router();
const upload = multer();

r.get("/", async (req, res) => {
  const items = await Gallery.find().sort({ createdAt: -1 });
  res.json(items);
});

r.post("/", auth, upload.single("file"), async (req, res) => {
  let url = (req.body.url || "").trim();

  if (!url && req.file) {
    url = await uploadBufferToCloudinary(req.file.buffer);
  }
  if (!url) return res.status(400).json({ error: "No image" });

  const item = await Gallery.create({
    url,
    caption: req.body.caption || "",
    uploadedBy: req.user.id,
  });

  console.log("✅ Gallery item created:", item.url);
  res.json(item);
});

r.delete("/:id", auth, async (req, res) => {
  const item = await Gallery.findById(req.params.id);
  if (!item) return res.status(404).json({ error: "Not found" });

  const isOwner = String(item.uploadedBy) === String(req.user.id);
  const isAdmin = req.user.role === "admin";
  if (!isOwner && !isAdmin) return res.status(403).json({ error: "Forbidden" });

  await item.deleteOne();
  res.json({ ok: true });
});

export default r;
