import { Router } from "express";
import multer from "multer";
import { auth } from "../middleware/auth.js";
import Event from "../models/Event.js";
import { uploadBufferToCloudinary } from "../utils/cloudinary.js";

const r = Router();
const upload = multer({ limits: { fileSize: 12 * 1024 * 1024 } });

r.get("/", async (_req, res) => {
  const items = await Event.find().sort({ startAt: -1 });
  res.json(items);
});

r.get("/active", async (_req, res) => {
  const now = new Date();
  const items = await Event.find({
    startAt: { $lte: now },
    endAt: { $gt: now },
  })
    .sort({ startAt: -1 })
    .limit(3);
  res.json(items);
});

r.post("/", auth, upload.single("file"), async (req, res) => {
  const title = (req.body.title || "").trim();
  if (!title) return res.status(400).json({ error: "Title required" });

  const description = (req.body.description || "").trim();
  let imageUrl = (req.body.imageUrl || "").trim();

  const startAt = new Date((req.body.startAt || "").trim());
  if (isNaN(startAt.getTime()))
    return res.status(400).json({ error: "Invalid startAt" });

  const hours = Math.max(1, Math.min(48, Number(req.body.durationHours || 24)));
  const endAt = new Date(startAt.getTime() + hours * 3600 * 1000);

  if (!imageUrl && req.file) {
    imageUrl = await uploadBufferToCloudinary(
      req.file.buffer,
      "goonies/events"
    );
  }
  if (!imageUrl)
    return res.status(400).json({ error: "Image required (url or file)" });

  const item = await Event.create({
    title,
    description,
    imageUrl,
    startAt,
    endAt,
    createdBy: req.user.id,
  });
  res.json(item);
});

r.delete("/:id", auth, async (req, res) => {
  const item = await Event.findById(req.params.id);
  if (!item) return res.status(404).json({ error: "Not found" });
  const isOwner = String(item.createdBy) === String(req.user.id);
  const isAdmin = req.user.role === "admin";
  if (!isOwner && !isAdmin) return res.status(403).json({ error: "Forbidden" });
  await item.deleteOne();
  res.json({ ok: true });
});

export default r;
