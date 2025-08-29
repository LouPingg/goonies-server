import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";

const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
  process.env;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.warn("⚠️ Cloudinary non configuré. Manque:", {
    cloud: !!CLOUDINARY_CLOUD_NAME,
    key: !!CLOUDINARY_API_KEY,
    secret: !!CLOUDINARY_API_SECRET,
  });
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

export function uploadBufferToCloudinary(buffer, folder = "goonies") {
  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image", format: "jpg", quality: "auto" },
      (err, res) => (err ? reject(err) : resolve(res.secure_url))
    );
    streamifier.createReadStream(buffer).pipe(upload);
  });
}
