import mongoose from "mongoose";

const AllowSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
});

export default mongoose.model("Allow", AllowSchema);
