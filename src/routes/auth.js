import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Allow from "../models/Allow.js";
import crypto from "crypto";
import PasswordReset from "../models/PasswordReset.js";

const r = Router();

// Seed admin si aucun admin
r.post("/seed-admin", async (req, res) => {
  const exists = await User.findOne({ role: "admin" });
  if (exists) return res.json({ ok: true, already: true });
  const passwordHash = await bcrypt.hash("goonies-admin", 10);
  const admin = await User.create({
    username: "admin",
    passwordHash,
    displayName: "Chef Goonies",
    role: "admin",
  });
  res.json({ ok: true, admin: { id: admin.id } });
});

r.post("/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Missing fields" });

  const allowed = await Allow.findOne({ username });
  if (!allowed) return res.status(403).json({ error: "Username not allowed" });

  const exists = await User.findOne({ username });
  if (exists) return res.status(409).json({ error: "Username taken" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    username,
    passwordHash,
    displayName: username,
  });

  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
  res.json({ token, user });
});

r.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(401).json({ error: "Invalid creds" });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid creds" });

  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
  res.json({ token, user });
});

r.post("/request-reset", async (req, res) => {
  const username = (req.body.username || "").trim();
  if (!username) return res.status(400).json({ error: "Username required" });

  const user = await User.findOne({ username }); // peut être null → on répond quand même OK
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h

  if (user) {
    await PasswordReset.create({
      userId: user._id,
      tokenHash,
      expiresAt,
      used: false,
    });
  }

  const payload = { ok: true };
  if (process.env.NODE_ENV !== "production") {
    payload.resetUrl = `http://localhost:5173/reset-password?token=${rawToken}`;
    payload.token = rawToken; // pratique en dev
  }
  res.json(payload);
});

// Réinitialiser le mot de passe via token
r.post("/reset-password", async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password)
    return res.status(400).json({ error: "Token and password required" });
  if (String(password).length < 6)
    return res.status(400).json({ error: "Password too short (min 6)" });

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const pr = await PasswordReset.findOne({
    tokenHash,
    used: false,
    expiresAt: { $gt: new Date() },
  });
  if (!pr) return res.status(400).json({ error: "Invalid or expired token" });

  const hash = await bcrypt.hash(String(password), 10);
  await User.findByIdAndUpdate(pr.userId, { passwordHash: hash });
  pr.used = true;
  await pr.save();

  res.json({ ok: true });
});

export default r;
