// goonies-server/src/routes/cards.js
import { Router } from "express";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";
import multer from "multer";
import User from "../models/User.js";
import { uploadBufferToCloudinary } from "../utils/cloudinary.js";

const r = Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ limits: { fileSize: 8 * 1024 * 1024 } });

const CFG = {
  art: { x: 0, y: -115, w: 600, h: 450, radius: 24 },

  gravity: "auto:faces",
  zoom: 1.0,

  name: { x: 200, y: 88, w: 560, size: 56, color: "#111111" },

  desc: {
    x: 100,
    y: 670,
    w: 560,
    size: 28,
    line: 6,
    color: "#333333",
    maxLen: 400,
  },

  tags: {
    x: 100,
    y: 870,
    w: 560,
    size: 30,
    color: "#111111",
    sep: " • ",
    max: 3,
  },

  themes: {
    yellow: "base-yellow-v1",
    blue: "base-blue-v1",
    green: "base-green-v1",
    red: "base-red-v1",
  },

  debugBorder: false,
};

function extractPublicIdFromCloudinaryUrl(url) {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("res.cloudinary.com")) return null;
    const after = u.pathname.split("/image/upload/")[1];
    if (!after) return null;
    const parts = after.split("/");
    if (parts[0] && /^v\d+$/.test(parts[0])) parts.shift();
    const joined = parts.join("/");
    const dot = joined.lastIndexOf(".");
    return dot > -1 ? joined.slice(0, dot) : joined;
  } catch {
    return null;
  }
}

function safeRemoteUrl(u) {
  const s = (u ?? "").toString().trim();
  if (!s || s === "undefined" || s === "null" || s === "about:blank")
    return null;
  try {
    const x = new URL(s);
    if (x.protocol === "http:" || x.protocol === "https:") return x.toString();
  } catch {}
  return null;
}

async function getTemplateVersion(publicId) {
  try {
    const info = await cloudinary.api.resource(publicId, {
      resource_type: "image",
      type: "upload",
    });
    return info?.version;
  } catch {
    return undefined;
  }
}

r.post("/preview-upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file" });
    const url = await uploadBufferToCloudinary(
      req.file.buffer,
      "goonies/preview"
    );
    res.json({ url });
  } catch (e) {
    console.error("preview-upload error:", e);
    res.status(500).json({ error: "Upload failed" });
  }
});

r.get("/preview.png", async (req, res) => {
  try {
    const themeKey = String(req.query.theme || "yellow").toLowerCase();
    const templateId = CFG.themes[themeKey] || CFG.themes.yellow;
    const version = await getTemplateVersion(templateId);

    const name = (req.query.name ? String(req.query.name) : "").slice(0, 30);
    const bio = (req.query.bio ? String(req.query.bio) : "").slice(
      0,
      CFG.desc.maxLen
    );

    let tagsArr = [];
    if (Array.isArray(req.query.tag)) {
      tagsArr = req.query.tag.map((s) => String(s)).filter(Boolean);
    } else if (typeof req.query.tags === "string") {
      tagsArr = String(req.query.tags)
        .split(/[|,]/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
    const tags = tagsArr.slice(0, CFG.tags.max).join(CFG.tags.sep);

    const rawAvatar = req.query.avatar ? String(req.query.avatar) : "";
    let overlayArt;
    const pid = extractPublicIdFromCloudinaryUrl(rawAvatar);
    if (pid) {
      overlayArt = `image:upload:${pid.replace(/\//g, ":")}`;
    } else {
      const remote =
        safeRemoteUrl(rawAvatar) ||
        "https://dummyimage.com/800x600/ddd/555.png&text=Avatar";
      overlayArt = { public_id: remote, type: "fetch", resource_type: "image" };
    }

    const gravity = req.query.g || CFG.gravity;
    const zoom = req.query.z ? Number(req.query.z) : CFG.zoom;
    const debug =
      req.query.debug === "1" || req.query.debug === "true" || CFG.debugBorder;

    const t = [];

    const avatarLayer = {
      overlay: overlayArt,
      width: CFG.art.w,
      height: CFG.art.h,
      crop: "fill",
      gravity,
      radius: CFG.art.radius,
    };
    if (!Number.isNaN(zoom) && zoom && zoom !== 1) avatarLayer.zoom = zoom;
    if (debug) avatarLayer.border = "2px_solid_lime";
    t.push(avatarLayer);
    t.push({ flags: "layer_apply", x: CFG.art.x, y: CFG.art.y });

    if (name) {
      t.push({
        overlay: {
          font_family: "Arial",
          font_size: CFG.name.size,
          text: name,
          text_align: "center",
          font_weight: "bold",
        },
        color: CFG.name.color,
        width: CFG.name.w || 560,
        crop: "fit",
      });
      t.push({
        flags: "layer_apply",
        gravity: "north",
        y: CFG.name.y,
      });
    }

    if (bio) {
      t.push({
        overlay: {
          font_family: "Arial",
          font_size: CFG.desc.size,
          text: bio.replace(/\n/g, "%0A"),
        },
        color: CFG.desc.color,
        width: CFG.desc.w,
        crop: "fit",
        line_spacing: CFG.desc.line,
      });
      t.push({
        flags: "layer_apply",
        x: CFG.desc.x,
        y: CFG.desc.y,
        gravity: "north_west",
      });
    }

    if (tags) {
      t.push({
        overlay: { font_family: "Arial", font_size: CFG.tags.size, text: tags },
        color: CFG.tags.color,
        width: CFG.tags.w,
        crop: "fit",
      });
      t.push({
        flags: "layer_apply",
        x: CFG.tags.x,
        y: CFG.tags.y,
        gravity: "north_west",
      });
    }

    const out = [];
    const w = parseInt(req.query.w || "0", 10);
    if (w > 0) out.push({ width: w, crop: "scale" });

    const url = cloudinary.url(templateId, {
      secure: true,
      resource_type: "image",
      type: "upload",
      version,
      force_version: true,
      sign_url: false,
      transformation: [...t, ...out],
    });

    return res.redirect(url);
  } catch (e) {
    console.error("cards preview error:", e);
    return res.status(500).send("error");
  }
});

r.get("/:ref.png", async (req, res) => {
  try {
    const ref = String(req.params.ref || "").trim();

    let user = null;
    if (mongoose.isValidObjectId(ref)) {
      user = await User.findById(ref, "-passwordHash");
    } else {
      user = await User.findOne({ username: ref }, "-passwordHash");
    }
    if (!user) return res.status(404).send("not found");

    const themeKey = req.query.theme || user.cardTheme || "yellow";
    const templateId = CFG.themes[themeKey] || CFG.themes.yellow;
    const version = await getTemplateVersion(templateId);

    const displayName = (user.displayName || user.username || "").slice(0, 30);
    const bio = (user.bio || "").slice(0, CFG.desc.maxLen);
    const tagsArr = Array.isArray(user.titles)
      ? user.titles.filter(Boolean)
      : [];
    const tags = tagsArr.slice(0, CFG.tags.max).join(CFG.tags.sep);

    let overlayArt;
    const pid = extractPublicIdFromCloudinaryUrl(user.avatarUrl || "");
    if (pid) {
      overlayArt = `image:upload:${pid.replace(/\//g, ":")}`;
    } else {
      const remote =
        safeRemoteUrl(user.avatarUrl) ||
        "https://dummyimage.com/800x600/ddd/555.png&text=Avatar";
      overlayArt = { public_id: remote, type: "fetch", resource_type: "image" };
    }

    const gravity = req.query.g || CFG.gravity;
    const zoom = req.query.z ? Number(req.query.z) : CFG.zoom;
    const debug =
      req.query.debug === "1" || req.query.debug === "true" || CFG.debugBorder;

    const t = [];

    const avatarLayer = {
      overlay: overlayArt,
      width: CFG.art.w,
      height: CFG.art.h,
      crop: "fill",
      gravity,
      radius: CFG.art.radius,
    };
    if (!Number.isNaN(zoom) && zoom && zoom !== 1) avatarLayer.zoom = zoom;
    if (debug) avatarLayer.border = "2px_solid_lime";
    t.push(avatarLayer);
    t.push({ flags: "layer_apply", x: CFG.art.x, y: CFG.art.y });

    t.push({
      overlay: {
        font_family: "Arial",
        font_size: CFG.name.size,
        text: displayName,
        text_align: "center",
        font_weight: "bold", // optionnel
      },
      color: CFG.name.color,
      width: CFG.name.w || 560,
      crop: "fit",
    });
    t.push({
      flags: "layer_apply",
      gravity: "north",
      y: CFG.name.y,
    });

    // bio
    if (bio) {
      t.push({
        overlay: {
          font_family: "Arial",
          font_size: CFG.desc.size,
          text: bio.replace(/\n/g, "%0A"),
        },
        color: CFG.desc.color,
        width: CFG.desc.w,
        crop: "fit",
        line_spacing: CFG.desc.line,
      });
      t.push({
        flags: "layer_apply",
        x: CFG.desc.x,
        y: CFG.desc.y,
        gravity: "north_west",
      });
    }

    // tags
    if (tags) {
      t.push({
        overlay: { font_family: "Arial", font_size: CFG.tags.size, text: tags },
        color: CFG.tags.color,
        width: CFG.tags.w,
        crop: "fit",
      });
      t.push({
        flags: "layer_apply",
        x: CFG.tags.x,
        y: CFG.tags.y,
        gravity: "north_west",
      });
    }

    const out = [];
    const w = parseInt(req.query.w || "0", 10);
    if (w > 0) out.push({ width: w, crop: "scale" });

    const url = cloudinary.url(templateId, {
      secure: true,
      resource_type: "image",
      type: "upload",
      version,
      force_version: true,
      sign_url: false,
      transformation: [...t, ...out],
    });

    return res.redirect(url);
  } catch (e) {
    console.error("cards route error:", e);
    return res.status(500).send("error");
  }
});

export default r;
