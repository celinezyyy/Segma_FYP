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
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36 });
      const filename = makeUniqueFilename(report);

      const bucket = getReportsBucket();
      const uploadStream = bucket.openUploadStream(filename, {
        contentType: 'application/pdf',
        metadata: { reportId: String(report._id || ''), userId: String(userId || '') },
      });

      // Pipe PDF into GridFS
      doc.pipe(uploadStream);

      // Header
      doc.fontSize(20).text('Customer Segmentation Report', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#666').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown(1);
      doc.fillColor('#000');

      // Overview
      doc.fontSize(14).text(`Overview`, { underline: true });
      doc.moveDown(0.5);
      // Datasets Used
      doc.fontSize(13).text('Datasets Used');
      doc.moveDown(0.2);
      const custName = report?.datasetNames?.customer || report.customerDatasetId || '-';
      const ordName = report?.datasetNames?.order || report.orderDatasetId || '-';
      doc.fontSize(12).text(`Customer dataset: ${custName}`);
      doc.fontSize(12).text(`Order dataset: ${ordName}`);
      doc.moveDown(0.3);

      // Segments table (Name + Description)
      const segments = Array.isArray(report.clusters) ? report.clusters : [];
      if (segments.length) {
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').fontSize(13).text(`${segments.length} Customer Segments Found`, { align: 'center' });

        const startY = doc.y + 12; // Add a bit of space after title
        const colW1 = 220; // Name column width
        const colW2 = Math.max(300, (doc.page.width - 36 * 2 - colW1 - 12)); // Description width, adjusted for right margin
        const tableWidth = colW1 + 12 + colW2;
        const leftX = 36; // Left margin
        const midX = leftX + colW1 + 6; // Middle separator (centered in 12pt gap)
        const rightX = leftX + tableWidth;
        const rowHeight = 24; // Fixed row height for simplicity; adjust if text wraps a lot
        let y = startY;

        // Set styles for borders
        const borderColor = '#CCC'; // Light gray for borders
        const borderWidth = 0.5; // Thin lines
        doc.lineWidth(borderWidth).strokeColor(borderColor);

        // Header row
        doc.font('Helvetica-Bold').fontSize(12).fillColor('#111');
        doc.text('Segment', leftX + 6, y + 6, { width: colW1 }); // Padding inside cell
        doc.text('Description', midX + 6, y + 6, { width: colW2 });

        // Draw header borders
        doc.rect(leftX, y, tableWidth, rowHeight).stroke(); // Outer header rect
        doc.moveTo(midX, y).lineTo(midX, y + rowHeight).stroke(); // Vertical separator
        y += rowHeight;

        // Body rows
        doc.font('Helvetica').fillColor('#000'); // Reset to regular font
        segments.forEach((s, idx) => {
          if (y + rowHeight > (doc.page.height - 36 * 2)) { // Check for page break (with bottom margin)
            doc.addPage();
            y = 36; // Reset to top margin on new page
            // Optionally redraw header on new page if needed: repeat header code here
          }

          const name = s.suggestedName || `Cluster ${s.cluster ?? idx + 1}`;
          const desc = s.description || '—';

          // Draw row text with padding
          doc.fontSize(11).text(String(name), leftX + 6, y + 6, { width: colW1 });
          doc.fontSize(10).fillColor('#333').text(String(desc), midX + 6, y + 6, { width: colW2 });

          // Draw row borders
          doc.rect(leftX, y, tableWidth, rowHeight).stroke(); // Outer row rect
          doc.moveTo(midX, y).lineTo(midX, y + rowHeight).stroke(); // Vertical separator

          y += rowHeight;
        });

        // Optional: Draw bottom border if not already covered by last row
        doc.moveTo(leftX, y).lineTo(rightX, y).stroke(); // Ensure bottom closes

        // Reset styles
        doc.fillColor('#000').strokeColor('#000').lineWidth(1);
      }
      // KPI cards (grid-like boxes)
      const k = report.kpis || {};
      const cards = [
        { title: 'Total Customers', value: k.totalCustomers },
        { title: 'Total Revenue', value: k.totalRevenue },
        { title: 'Average Spend', value: k.averageSpendOverall },
        { title: 'Average Days Since Last Purchase', value: k.overallAvgRecency },
        { title: 'Average Purchases Per Month', value: k.overallAvgFrequency },
      ];
      doc.moveDown(0.5);
      doc.fontSize(13).text('Key Metrics');
      doc.moveDown(0.3);
      const cardW = 250;
      const cardH = 72;
      const gap = 16;
      const startX = 36;
      let cx = startX;
      let cy = doc.y;
      const usableWidth = doc.page.width - 72;
      cards.forEach((c) => {
        if (cx + cardW > usableWidth) { cx = startX; cy += cardH + gap; }
        doc.roundedRect(cx, cy, cardW, cardH, 8).fillAndStroke('#F3F4F6', '#E5E7EB');
        doc.fillColor('#111').fontSize(11).text(c.title, cx + 10, cy + 10, { width: cardW - 20 });
        doc.fontSize(16).fillColor('#0F172A').text(String(c.value ?? '—'), cx + 10, cy + 34, { width: cardW - 20 });
        cx += cardW + gap;
        doc.fillColor('#000');
      });

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
          const fitW = doc.page.width - 72; // account for margins
          const fitH = doc.page.height - 144; // header + margin space
          doc.image(buf, { fit: [fitW, fitH], align: 'center' });
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
