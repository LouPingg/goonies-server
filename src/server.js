// src/server.js
import "dotenv/config"; // ✅ préfère 'dotenv/config' (sans .js)
import express from "express";
import cors from "cors";
import { connectDB } from "./db.js";

import authRoutes from "./routes/auth.js";
import allowRoutes from "./routes/allow.js";
import userRoutes from "./routes/users.js";
import galleryRoutes from "./routes/gallery.js";
import eventRoutes from "./routes/events.js";

const app = express();
import helmet from "helmet";
import rateLimit from "express-rate-limit";

app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 300, // 300 req / 15 min / IP
});
app.use(limiter);

/**
 * CORS — autorise explicitement le front en dev et, plus tard, GitHub Pages.
 * - localhost:5173  → front Vite (dev)
 * - https://loupingg.github.io → front GitHub Pages (prod)  ⚠️ adapte avec ton user
 */

const allowed = [
  "http://localhost:5173", // dev
  "https://<ton-user>.github.io", // ton user pages
  "https://<ton-user>.github.io/<repo>", // ton repo pages (projet)
].filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // outils locaux (curl, etc.)
      cb(null, allowed.includes(origin));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => res.json({ ok: true, name: "goonies-api" }));

app.use("/auth", authRoutes);
app.use("/allow", allowRoutes);
app.use("/users", userRoutes);
app.use("/gallery", galleryRoutes);
app.use("/events", eventRoutes);

const port = process.env.PORT || 4000;
connectDB(process.env.MONGODB_URI)
  .then(() =>
    app.listen(port, () => console.log(`🚀 API http://localhost:${port}`))
  )
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
