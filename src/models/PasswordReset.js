import mongoose from "mongoose";

const PasswordResetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHash: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Auto-suppression après expiration
PasswordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("PasswordReset", PasswordResetSchema);
