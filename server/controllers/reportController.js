import Report from '../models/reportModel.js';
import { getReportsBucket } from '../utils/gridfs.js';
import { Types } from 'mongoose';
import { generateAndStoreReportPDF } from '../services/pdfService.js';

// Draft: create report metadata; PDF generation is optional/stubbed
export const createReport = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.json({ success: false, message: 'Unauthorized' });

    const {
      segmentationId,
      customerDatasetId,
      orderDatasetId,
      datasetNames,
      features,
      pair,
      bestK,
      kpis,
      clusters,
      generatePdf = true,
    } = req.body || {};

    if (!segmentationId || !bestK) {
      return res.json({ success: false, message: 'segmentationId and bestK are required' });
    }

    // Check for existing report to avoid duplicates
    const existing = await Report.findOne({
      userId,
      segmentationId,
      customerDatasetId: customerDatasetId || null,
      orderDatasetId: orderDatasetId || null,
    });

    let report;
    if (existing) {
      report = existing;
    } else {
      report = await Report.create({
        userId,
        segmentationId,
        title: (pair && (pair.title || pair.label)) || 'Segmentation Report',
        customerDatasetId: customerDatasetId || null,
        orderDatasetId: orderDatasetId || null,
        datasetNames: datasetNames || {},
        features: Array.isArray(features) ? features : [],
        pair: pair || {},
        bestK,
        kpis: kpis || {},
        clusters: Array.isArray(clusters) ? clusters : [],
        pdfFileId: null,
        pdfFilename: undefined,
        pdfSize: undefined,
      });
    }

    // Optionally generate PDF and attach to report
    let pdfInfo = null;
    const images = req.body?.images || null; // optional base64 images from client
    if (generatePdf && !report.pdfFileId) {
      try {
        const result = await generateAndStoreReportPDF({ report, userId, images });
        if (result?.fileId) {
          report.pdfFileId = result.fileId;
          report.pdfFilename = result.filename;
          await report.save();
          pdfInfo = { fileId: result.fileId, filename: result.filename };
        }
      } catch (e) {
        console.warn('[createReport] PDF generation failed, saving metadata only:', e?.message);
      }
    }

    return res.json({ success: true, data: { id: report._id, pdf: pdfInfo, reused: Boolean(existing) } });
  } catch (err) {
    console.error('[createReport] error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create report' });
  }
};

export const listReports = async (req, res) => {
  try {
    const userId = req.userId;
    const items = await Report.find({ userId })
      .sort({ createdAt: -1 })
      .select('title segmentationId bestK features createdAt pdfFileId datasetNames pair')
      .lean();
    return res.json({ success: true, data: items });
  } catch (err) {
    console.error('[listReports] error:', err);
    return res.status(500).json({ success: false, message: 'Failed to list reports' });
  }
};

export const getReportPdf = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const doc = await Report.findOne({ _id: id, userId }).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Report not found' });
    if (!doc.pdfFileId) return res.status(404).json({ success: false, message: 'PDF not generated for this report' });

    const bucket = getReportsBucket();
    const fileId = new Types.ObjectId(String(doc.pdfFileId));
    const downloadStream = bucket.openDownloadStream(fileId);
    res.setHeader('Content-Type', 'application/pdf');
    const safeTitle = (doc.title || doc.pdfFilename || 'report').replace(/\"/g, '');
    res.setHeader('Content-Disposition', `inline; filename="${safeTitle}.pdf"`);
    downloadStream.on('error', (e) => {
      console.error('[getReportPdf] stream error:', e);
      res.status(500).end();
    });
    downloadStream.pipe(res);
  } catch (err) {
    console.error('[getReportPdf] error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch PDF' });
  }
};

export const updateReport = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { title } = req.body || {};

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Valid title is required' });
    }

    const updated = await Report.findOneAndUpdate(
      { _id: id, userId },
      { $set: { title: title.trim() } },
      { new: true }
    ).lean();

    if (!updated) return res.status(404).json({ success: false, message: 'Report not found' });
    return res.json({ success: true, data: { id: updated._id, title: updated.title } });
  } catch (err) {
    console.error('[updateReport] error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update report' });
  }
};

export const deleteReport = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const doc = await Report.findOne({ _id: id, userId });
    if (!doc) return res.status(404).json({ success: false, message: 'Report not found' });

    // Attempt to remove PDF if present
    if (doc.pdfFileId) {
      try {
        const bucket = getReportsBucket();
        await bucket.delete(new Types.ObjectId(String(doc.pdfFileId)));
      } catch (e) {
        console.warn('[deleteReport] Failed to delete PDF from GridFS:', e?.message);
      }
    }

    await Report.deleteOne({ _id: doc._id });
    return res.json({ success: true });
  } catch (err) {
    console.error('[deleteReport] error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete report' });
  }
};
