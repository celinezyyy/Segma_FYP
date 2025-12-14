import mongoose from 'mongoose';

const datasetTemplateSchema = new mongoose.Schema({
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
  type: { type: String, enum: ['customer', 'order'], required: true },
  fileName: { type: String, required: true },
  mimetype: { type: String, required: true },
  data: { type: Buffer, required: true },
  uploadedAt: { type: Date, default: Date.now },
});

// Ensure a user can have only one template per type
datasetTemplateSchema.index({ uploadedBy: 1, type: 1 }, { unique: true });

export default mongoose.model('DatasetTemplate', datasetTemplateSchema);
