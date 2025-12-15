import PDFDocument from 'pdfkit';
import { getReportsBucket } from '../utils/gridfs.js';

export const generateAndStoreReportPDF = ({ report, userId }) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 36 });
      const filename = `segmentation_report_${report.bestK}clusters_${new Date().toISOString().slice(0,10)}.pdf`;

      const bucket = getReportsBucket();
      const uploadStream = bucket.openUploadStream(filename, {
        contentType: 'application/pdf',
        metadata: { reportId: String(report._id || ''), userId: String(userId || '') },
      });

      // Pipe PDF into GridFS
      doc.pipe(uploadStream);

      // Header
      doc.fontSize(18).text('Customer Segmentation Report', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#666').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown(1);
      doc.fillColor('#000');

      // Overview
      doc.fontSize(14).text(`Overview`, { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).list([
        `Segmentation ID: ${report.segmentationId}`,
        `Best K: ${report.bestK}`,
        `Datasets: ${report?.datasetNames?.customer || report.customerDatasetId || '-'} / ${report?.datasetNames?.order || report.orderDatasetId || '-'}`,
        `Features: ${(report.features || []).join(', ') || '-'}`,
      ]);
      if (report.kpis) {
        doc.moveDown(0.5);
        doc.text(`KPIs:`);
        doc.list([
          `Total Customers: ${report.kpis.totalCustomers ?? '-'}`,
          `Total Revenue: ${report.kpis.totalRevenue ?? '-'}`,
          `Average Spend: ${report.kpis.averageSpendOverall ?? '-'}`,
        ], { bulletRadius: 2 });
      }

      // Clusters
      const clusters = report.clusters || [];
      if (clusters.length) {
        doc.moveDown(1);
        doc.fontSize(14).text(`Clusters (${clusters.length})`, { underline: true });
        clusters.forEach((c, idx) => {
          doc.moveDown(0.5);
          doc.fontSize(12).text(`${idx + 1}. ${c.suggestedName || `Cluster ${c.cluster}`}`);
          doc.fontSize(10).list([
            `Customers: ${c.sizePct ?? '-'}%`,
            `Revenue Share: ${c.revenuePct ?? '-'}%`,
            `Avg Spend: ${c.avgSpend ?? '-'}`,
            `Top State: ${c.topState || '-'}`,
            c.segmentType ? `Type: ${c.segmentType}` : null,
            c.keyInsight ? `Insight: ${c.keyInsight}` : null,
            c.recommendedAction ? `Action: ${c.recommendedAction}` : null,
          ].filter(Boolean));

          const topStates = (c.states || []).slice(0, 5).map(s => `${s.name}: ${s.revenue}`);
          if (topStates.length) {
            doc.moveDown(0.2);
            doc.text('Top States:');
            doc.list(topStates, { bulletRadius: 2 });
          }
          const topItems = (c.items || []).slice(0, 5).map(i => `${i.name}: ${i.count}`);
          if (topItems.length) {
            doc.moveDown(0.2);
            doc.text('Top Products:');
            doc.list(topItems, { bulletRadius: 2 });
          }
        });
      }

      doc.end();

      uploadStream.on('finish', async (file) => {
        try {
          resolve({ fileId: uploadStream.id, filename });
        } catch (e) {
          resolve({ fileId: uploadStream.id, filename });
        }
      });
      uploadStream.on('error', (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
};
