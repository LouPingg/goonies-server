import { Router } from "express";
import multer from "multer";
import bcrypt from "bcrypt";
import { auth } from "../middleware/auth.js";
import { adminOnly } from "../middleware/admin.js";
import User from "../models/User.js";
import { uploadBufferToCloudinary } from "../utils/cloudinary.js";

const r = Router();
const upload = multer({ limits: { fileSize: 8 * 1024 * 1024 } });

r.get("/", async (req, res) => {
  const q = (req.query.q || "").trim();
  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  const limit = Math.max(1, Math.min(50, parseInt(req.query.limit || "9", 10)));

  const filter = q
    ? {
        $or: [
          { username: { $regex: q, $options: "i" } },
          { displayName: { $regex: q, $options: "i" } },
        ],
      }
    : {};

  const total = await User.countDocuments(filter);
  const items = await User.find(filter, "-passwordHash")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  res.json({
    items,
    page,
    limit,
    total,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
});

r.get("/me", auth, async (req, res) => {
  const me = await User.findById(req.user.id, "-passwordHash");
  res.json(me);
});

r.patch("/me", auth, upload.single("file"), async (req, res) => {
  try {
    let { displayName = "", avatarUrl = "", titles } = req.body;

    if (req.file) {
      avatarUrl = await uploadBufferToCloudinary(
        req.file.buffer,
        "goonies/avatars"
      );
    }

    if (typeof titles === "string") {
      try {
        const parsed = JSON.parse(titles);
        if (Array.isArray(parsed)) titles = parsed;
      } catch {
        titles = titles
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }
    if (!Array.isArray(titles)) {
      titles = undefined;
    }

    const patch = {};
    if (displayName?.trim()) patch.displayName = displayName.trim();
    if (avatarUrl?.trim()) patch.avatarUrl = avatarUrl.trim();
    if (titles) patch.titles = titles;

    const { bio, cardTheme } = req.body;
    if (typeof bio === "string") {
      patch.bio = bio.trim().slice(0, 400);
    }
    if (
      typeof cardTheme === "string" &&
      ["yellow", "blue", "green", "red"].includes(cardTheme)
    ) {
      patch.cardTheme = cardTheme;
    }

    const me = await User.findByIdAndUpdate(req.user.id, patch, {
      new: true,
      select: "-passwordHash",
    });
    res.json(me);
  } catch (e) {
    res.status(400).json({ error: e?.message || "Invalid profile data" });
  }
});

r.delete("/:id", auth, adminOnly, async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user) return res.status(404).json({ error: "Not found" });
  if (user.role === "admin")
    return res.status(400).json({ error: "Cannot delete admin users" });
  if (String(req.user.id) === String(id))
    return res.status(400).json({ error: "Cannot delete yourself" });
  await User.findByIdAndDelete(id);
  res.json({ ok: true });
});

r.patch("/:id/password", auth, adminOnly, async (req, res) => {
  try {
    const { password } = req.body || {};
    if (!password || String(password).length < 6) {
      return res.status(400).json({ error: "Password too short (min 6)" });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "Not found" });
    if (user.role === "admin") {
      return res.status(400).json({ error: "Cannot reset admin password" });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    await User.findByIdAndUpdate(user._id, { passwordHash });
    return res.json({ ok: true });
  } catch (e) {
    console.error("admin reset pwd error:", e);
    res.status(500).json({ error: "Reset failed" });
  }
});

if (typeof bio === "string") {
  const clean = bio.trim().slice(0, 400);
  if (clean) patch.bio = clean;
  else if (bio === "") patch.bio = "";
}
if (
  typeof cardTheme === "string" &&
  ["yellow", "blue", "red"].includes(cardTheme)
) {
  patch.cardTheme = cardTheme;
}

export default r;
