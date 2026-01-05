import PDFDocument from 'pdfkit';
import { getReportsBucket } from '../utils/gridfs.js';

const toSafe = (s) => String(s || '').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 80);

const makeUniqueFilename = (report) => {
  const parts = [
    'seg', toSafe(report.segmentationId),
    'cust', toSafe(report.customerDatasetId || 'na'),
    'ord', toSafe(report.orderDatasetId || 'na'),
    `${report.bestK}k`,
    new Date().toISOString().replace(/[:.]/g, '-'),
  ];
  return `${parts.join('_')}.pdf`;
};

export const generateAndStoreReportPDF = ({ report, userId, images }) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 36 });
      const filename = makeUniqueFilename(report);

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

      // Optional dashboard images (overview + clusters)
      const addImage = (img, caption) => {
        try {
          if (!img) return;
          const base64 = String(img).replace(/^data:image\/[a-zA-Z]+;base64,/, '');
          const buf = Buffer.from(base64, 'base64');
          doc.addPage();
          if (caption) {
            doc.fontSize(14).text(caption, { underline: true });
            doc.moveDown(0.5);
          }
          doc.image(buf, { fit: [520, 700], align: 'center' });
        } catch {}
      };

      if (Array.isArray(images?.overview)) {
        images.overview.forEach((img, i) => addImage(img, `Overview Panel ${i + 1}`));
      } else if (images?.overview) {
        addImage(images.overview, 'Overview Dashboard');
      }
      if (Array.isArray(images?.clusters)) {
        images.clusters.forEach((img, i) => addImage(img, `Cluster Dashboard ${i + 1}`));
      }

      // Utilities: simple key-value table for cluster summary
      const drawKVTable = (rows, startY = doc.y) => {
        const labelW = 180;
        const valueW = 320;
        let y = startY;
        doc.fontSize(10);
        rows.forEach((r) => {
          doc.text(String(r.label || ''), 36, y, { width: labelW });
          doc.text(String(r.value || ''), 36 + labelW + 12, y, { width: valueW });
          y += 16;
        });
        doc.moveTo(36, y).lineTo(540, y).strokeColor('#ddd').stroke();
        doc.fillColor('#000');
        return y + 8;
      };

      // Clusters
      const clusters = report.clusters || [];
      if (clusters.length) {
        doc.moveDown(1);
        doc.fontSize(14).text(`Clusters (${clusters.length})`, { underline: true });
        clusters.forEach((c, idx) => {
          doc.addPage();
          doc.fontSize(12).text(`${idx + 1}. ${c.suggestedName || `Cluster ${c.cluster}`}`, { underline: true });
          doc.moveDown(0.5);
          const nextY = drawKVTable([
            { label: 'Customers %', value: c.sizePct ?? '-' },
            { label: 'Revenue Share %', value: c.revenuePct ?? '-' },
            { label: 'Average Spend', value: c.avgSpend ?? '-' },
            { label: 'Top State', value: c.topState || '-' },
            c.segmentType ? { label: 'Type', value: c.segmentType } : null,
            c.keyInsight ? { label: 'Insight', value: c.keyInsight } : null,
            c.recommendedAction ? { label: 'Action', value: c.recommendedAction } : null,
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
