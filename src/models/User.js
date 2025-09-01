import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true, unique: true },
    passwordHash: { type: String, required: true },
    displayName: { type: String, trim: true },
    avatarUrl: { type: String, trim: true },
    titles: [{ type: String, trim: true }], // ← tes “tags”
    bio: { type: String, trim: true, maxlength: 400 }, // ← description
    cardTheme: {
      type: String,
      enum: ["yellow", "blue", "red"],
      default: "yellow",
    }, // ← couleur
    role: { type: String, enum: ["admin", "member"], default: "member" },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
