import mongoose from 'mongoose';

const runSegmentationSchema = new mongoose.Schema({
  selectedPair: [String],
  bestK: { type: Number },
  evaluation: { type: Object },
  cluster_summary: { type: Object },
  cluster_assignments: { type: Object },
  decision: { type: Object },
}, { _id: false });

const segmentationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
  customerDatasetId: { type: mongoose.Schema.Types.ObjectId, ref: 'dataset', required: true },
  orderDatasetId: { type: mongoose.Schema.Types.ObjectId, ref: 'dataset', required: true },
  mergedFileId: { type: mongoose.Schema.Types.ObjectId, default: null },
  summary: { type: Object, default: null },
  runsSegmentationResult: { type: [runSegmentationSchema], default: [] },
}, { timestamps: true });

// Ensure only one segmentation per user + dataset pair
segmentationSchema.index({ user: 1, customerDatasetId: 1, orderDatasetId: 1 }, { unique: true });

export default mongoose.model('segmentation', segmentationSchema);