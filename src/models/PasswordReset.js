import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tokenHash: { type: String, required: true, index: true, unique: true },
    expiresAt: { type: Date, required: true, index: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// TTL automatique (Mongo supprime les docs après "expiresAt")
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("PasswordReset", schema);
