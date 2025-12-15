import mongoose from 'mongoose';

const ClusterSummarySchema = new mongoose.Schema(
  {
    cluster: { type: Number, required: true },
    suggestedName: { type: String },
    sizePct: { type: Number },
    revenuePct: { type: Number },
    avgSpend: { type: Number },
    topState: { type: String },
    segmentType: { type: String },
    keyInsight: { type: String },
    recommendedAction: { type: String },
    states: [
      {
        name: String,
        revenue: Number,
      },
    ],
    items: [
      {
        name: String,
        count: Number,
      },
    ],
  },
  { _id: false }
);

const ReportSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', index: true, required: true },
    segmentationId: { type: String, index: true, required: true },

    // User-facing title (used for listing and download filename)
    title: { type: String },

    // Datasets context
    customerDatasetId: { type: String },
    orderDatasetId: { type: String },
    datasetNames: {
      customer: { type: String },
      order: { type: String },
    },

    // Features / Pair context
    features: [{ type: String }],
    pair: {
      id: { type: String },
      label: { type: String },
      tagline: { type: String },
    },

    // KPIs / Overview
    bestK: { type: Number, required: true },
    kpis: {
      totalCustomers: { type: Number },
      totalRevenue: { type: Number },
      averageSpendOverall: { type: Number },
    },

    // Cluster summaries
    clusters: [ClusterSummarySchema],

    // PDF metadata (stored in GridFS; using existing bucket for draft)
    pdfFileId: { type: mongoose.Schema.Types.ObjectId, default: null },
    pdfFilename: { type: String },
    pdfSize: { type: Number },
  },
  { timestamps: true }
);

const Report = mongoose.model('report', ReportSchema);
export default Report;
