// goonies-server/src/server.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { v2 as cloudinary } from "cloudinary";
import { connectDB } from "./db.js";

import authRoutes from "./routes/auth.js";
import allowRoutes from "./routes/allow.js";
import userRoutes from "./routes/users.js";
import galleryRoutes from "./routes/gallery.js";
import eventRoutes from "./routes/events.js";
import cardsRoutes from "./routes/cards.js";

const app = express();

/* ---------- Sécurité & limites ---------- */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // autorise <img> cross-origin
    crossOriginEmbedderPolicy: false, // évite un blocage côté Chromium
  })
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
  })
);

/* ---------- CORS ---------- */
const allowed = [
  "http://localhost:5173",
  "https://loupingg.github.io",
  "https://loupingg.github.io/Goonies",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      cb(null, allowed.includes(origin));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

/* ---------- Root ---------- */
app.get("/", (_req, res) => res.json({ ok: true, name: "goonies-api" }));

/* ---------- Routes métier ---------- */
app.use("/auth", authRoutes);
app.use("/allow", allowRoutes);
app.use("/users", userRoutes);
app.use("/gallery", galleryRoutes);
app.use("/events", eventRoutes);
app.use("/cards", cardsRoutes);

/* ---------- Cloudinary CONFIG + DEBUG (temporaire) ---------- */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Qui suis-je ?
app.get("/debug/cloudinary/whoami", (_req, res) => {
  res.json({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key_prefix: String(process.env.CLOUDINARY_API_KEY || "").slice(0, 6),
    has_secret: !!process.env.CLOUDINARY_API_SECRET,
  });
});

// Liste par préfixe (ex: ?prefix=goonies/cards/)
app.get("/debug/cloudinary/list", async (req, res) => {
  try {
    const prefix = String(req.query.prefix || "");
    const out = await cloudinary.api.resources({
      type: "upload",
      resource_type: "image",
      prefix,
      max_results: 100,
    });
    res.json(
      (out.resources || []).map((r) => ({
        public_id: r.public_id,
        version: r.version,
        secure_url: r.secure_url,
      }))
    );
  } catch (e) {
    res.status(500).json({ error: e?.error?.message || String(e) });
  }
});

// Search par dossier (ex: ?folder=goonies/cards)
app.get("/debug/cloudinary/search", async (req, res) => {
  try {
    const folder = String(req.query.folder || "goonies/cards");
    const out = await cloudinary.search
      .expression(`folder="${folder}" AND resource_type:image AND type=upload`)
      .max_results(100)
      .execute();
    res.json(
      (out.resources || []).map((r) => ({
        public_id: r.public_id,
        version: r.version,
        secure_url: r.secure_url,
        folder: r.folder,
      }))
    );
  } catch (e) {
    res.status(500).json({ error: e?.error?.message || String(e) });
  }
});

/* ---------- Démarrage ---------- */
const port = process.env.PORT || 4000;

connectDB(process.env.MONGODB_URI)
  .then(() => {
    app.listen(port, () => console.log(`🚀 API http://localhost:${port}`));
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
