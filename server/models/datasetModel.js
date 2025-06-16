import mongoose from "mongoose";

const datasetSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalname: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
  uploadedAt: { type: Date, default: Date.now },
  type: { type: String, enum: ['Customer', 'Order'], required: true },
});

const datasetModel = mongoose.models.dataset || mongoose.model('dataset', datasetSchema);
export default datasetModel;
