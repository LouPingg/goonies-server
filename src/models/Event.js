import mongoose from "mongoose";

const EventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    startAt: { type: Date, required: true }, // UTC
    endAt: { type: Date, required: true }, // UTC
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

EventSchema.index({ startAt: 1, endAt: 1 });
EventSchema.index({ endAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("Event", EventSchema);
