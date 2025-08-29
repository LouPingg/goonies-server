// src/routes/users.js
import { Router } from "express";
import multer from "multer";
import { auth } from "../middleware/auth.js";
import { adminOnly } from "../middleware/admin.js";
import User from "../models/User.js";
import { uploadBufferToCloudinary } from "../utils/cloudinary.js";

const r = Router();
const upload = multer({ limits: { fileSize: 8 * 1024 * 1024 } });

// Liste publique (sans passwordHash)
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

// ✅ Mise à jour profil courant (JSON ou multipart + file)
r.patch("/me", auth, upload.single("file"), async (req, res) => {
  try {
    // Champs possibles depuis le front
    let { displayName = "", avatarUrl = "", titles } = req.body;

    // Si un fichier est envoyé, on l’upload et on remplace avatarUrl
    if (req.file) {
      avatarUrl = await uploadBufferToCloudinary(
        req.file.buffer,
        "goonies/avatars"
      );
    }

    // Normaliser titles : peut arriver en array (JSON) ou string
    if (typeof titles === "string") {
      // essayer JSON d'abord, sinon split par virgule
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
      // ne pas écraser si non fourni
      titles = undefined;
    }

    const patch = {};
    if (displayName?.trim()) patch.displayName = displayName.trim();
    if (avatarUrl?.trim()) patch.avatarUrl = avatarUrl.trim();
    if (titles) patch.titles = titles;

    const me = await User.findByIdAndUpdate(req.user.id, patch, {
      new: true,
      select: "-passwordHash",
    });
    res.json(me);
  } catch (e) {
    res.status(400).json({ error: e?.message || "Invalid profile data" });
  }
});

// (le reste inchangé : delete admin-only, etc.)
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

export default r;
