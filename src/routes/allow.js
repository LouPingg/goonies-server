import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { adminOnly } from "../middleware/admin.js";
import Allow from "../models/Allow.js";

const r = Router();

r.get("/", auth, adminOnly, async (req, res) => {
  const list = await Allow.find().sort({ username: 1 });
  res.json(list);
});

r.post("/", auth, adminOnly, async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: "Missing username" });
  await Allow.updateOne({ username }, { username }, { upsert: true });
  res.json({ ok: true });
});

r.delete("/:username", auth, adminOnly, async (req, res) => {
  await Allow.deleteOne({ username: req.params.username });
  res.json({ ok: true });
});

export default r;
