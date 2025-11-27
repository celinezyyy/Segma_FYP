import mongoose from 'mongoose';

const segmentationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
  customerDatasetId: { type: mongoose.Schema.Types.ObjectId, ref: 'dataset', required: true },
  orderDatasetId: { type: mongoose.Schema.Types.ObjectId, ref: 'dataset', required: true },
  mergedFileId: { type: mongoose.Schema.Types.ObjectId, default: null },

  summary: { type: Object, default: null },
  availablePairs: { type: Array, default: [] },
  selectedPair: { type: Object, default: null },
  segmentationResult: { type: Object, default: null },
}, { timestamps: true });

// Ensure only one segmentation per user + dataset pair
segmentationSchema.index({ user: 1, customerDatasetId: 1, orderDatasetId: 1 }, { unique: true });

export default mongoose.model('segmentation', segmentationSchema);