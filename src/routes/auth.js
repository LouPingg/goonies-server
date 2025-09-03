import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Allow from "../models/Allow.js";

const r = Router();

r.post("/seed-admin", async (_req, res) => {
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
  try {
    const { username, password } = req.body || {};
    const u = (username || "").trim();

    if (!u || !password) {
      return res.status(400).json({ error: "Missing fields" });
    }
    if (u.length < 3) {
      return res.status(400).json({ error: "Username too short (min 3)" });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: "Password too short (min 6)" });
    }

    const allowed = await Allow.findOne({ username: u });
    if (!allowed) {
      return res.status(403).json({ error: "Username not allowed" });
    }

    const existsUser = await User.findOne({ username: u });
    if (existsUser) {
      return res.status(409).json({ error: "Username taken" });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const user = await User.create({
      username: u,
      displayName: u,
      passwordHash,
    });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, user });
  } catch (e) {
    console.error("REGISTER ERROR:", e);
    res.status(500).json({ error: "Register failed" });
  }
});

r.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: "Missing username or password" });
    }
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: "Invalid creds" });
    if (!user.passwordHash)
      return res.status(500).json({ error: "User has no passwordHash" });

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid creds" });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.json({ token, user });
  } catch (e) {
    console.error("LOGIN ERROR:", e);
    res.status(500).json({ error: "Login failed" });
  }
});

export default r;
