import mongoose from "mongoose";

function mask(uri) {
  return uri.replace(/(mongodb\+srv:\/\/)(.*?)(@)/, (_, p1, creds, p3) => {
    const [u] = creds.split(":");
    return `${p1}${u}:***${p3}`;
  });
}

export async function connectDB(uri) {
  try {
    mongoose.set("strictQuery", true);
    await mongoose.connect(uri);
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ Mongo connect failed. URI =", mask(uri));
    throw err;
  }
}
