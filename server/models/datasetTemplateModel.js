import mongoose from 'mongoose';

const datasetTemplateSchema = new mongoose.Schema({
  type: { type: String, enum: ['customer', 'order'], required: true, unique: true },
  fileName: { type: String, required: true },
  mimetype: { type: String, required: true },
  data: { type: Buffer, required: true },   // <-- store the actual file binary
  uploadedAt: { type: Date, default: Date.now },
});

export default mongoose.model('DatasetTemplate', datasetTemplateSchema);
