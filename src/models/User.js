import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, unique: true, required: true }, // identifiant du jeu
    passwordHash: { type: String, required: true },
    displayName: { type: String, default: "" },
    avatarUrl: { type: String, default: "" },
    titles: { type: [String], default: [] },
    role: { type: String, enum: ["admin", "member"], default: "member" },
  },
  { timestamps: true }
);

export default mongoose.model("User", UserSchema);
