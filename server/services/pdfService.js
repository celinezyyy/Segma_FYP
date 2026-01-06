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
      doc.font('Helvetica-Bold').fontSize(20).text('Customer Segmentation Report', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor('#666').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown(1);
      doc.fillColor('#000');

      // Overview
      doc.font('Helvetica-Bold').fontSize(15)
        .text(`Customer Segmentation Dashboard Overview`, 36, doc.y, {
          width: doc.page.width - 72,
          underline: true,
          align: 'center'
        });
      doc.moveDown(0.5);
      // Datasets Used
      doc.font('Helvetica-Bold').fontSize(14).text('Datasets Used');
      doc.moveDown(0.2);
      const custName = report?.datasetNames?.customer || report.customerDatasetId || '-';
      const ordName = report?.datasetNames?.order || report.orderDatasetId || '-';
      // First line: Bold label, regular value
      doc.font('Helvetica-Bold').fontSize(12).text('Customer dataset: ', { continued: true });
      doc.font('Helvetica').text(`${custName}`);
      doc.moveDown(0.2);
      // Second line: Bold label, regular value
      doc.font('Helvetica-Bold').fontSize(12).text('Order dataset: ', { continued: true });
      doc.font('Helvetica').text(`${ordName}`);
      doc.moveDown(0.3);

      const segments = Array.isArray(report.clusters) ? report.clusters : [];
      if (segments.length) {
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').fontSize(14)
          .text(`${segments.length} Customer Segments Found`, 36, doc.y, {
            width: doc.page.width - 72,
            align: 'center'
          });

        const startY = doc.y + 20;
        const colW1 = 220;                    // Name column
        const colW2 = doc.page.width - 36 * 2 - colW1 - 12; // Description column (full remaining width)
        const tableWidth = colW1 + 12 + colW2;
        const leftX = 36;
        const midX = leftX + colW1 + 6;        // Vertical separator position
        const rightX = leftX + tableWidth;

        const borderColor = '#CCC';
        const headerBgColor = '#F0F0F0';       // Light gray background for header
        const cellPadding = 2;

        doc.lineWidth(0.5).strokeColor(borderColor);

        let y = startY;

        // === HEADER ROW ===
        const headerHeight = 30;
        const headerTextY = y + cellPadding;

        // Background fill for header
        doc.fillColor(headerBgColor)
          .rect(leftX, y, tableWidth, headerHeight)
          .fill();

        // Header text (bold, dark)
        doc.fillColor('#111').font('Helvetica-Bold').fontSize(12);
        doc.text('Segment Name', leftX + cellPadding, headerTextY, { width: colW1 });
        doc.text('Description', midX + cellPadding, headerTextY, { width: colW2 });

        // Header borders (stroke over the fill)
        doc.strokeColor(borderColor)
          .rect(leftX, y, tableWidth, headerHeight)
          .stroke();
        doc.moveTo(midX, y).lineTo(midX, y + headerHeight).stroke();

        y += headerHeight;

        // === BODY ROWS (with dynamic height) ===
        doc.font('Helvetica').fontSize(12).fillColor('#000');

        segments.forEach((s, idx) => {
          const name = s.suggestedName || `${s.cluster ?? idx + 1} Group`;
          const desc = s.description || '—';

          // Temporarily measure height of both columns
          const nameHeight = doc.heightOfString(String(name), {
            width: colW1 - 2 * cellPadding,
            lineGap: 2
          });
          const descHeight = doc.heightOfString(String(desc), {
            width: colW2 - 2 * cellPadding,
            fontSize: 10,
            lineGap: 2
          });

          const contentHeight = Math.max(nameHeight, descHeight);
          const rowHeight = contentHeight + 2 * cellPadding + 8; // Extra padding at top/bottom

          // Page break check
          if (y + rowHeight > doc.page.height - 72) {
            doc.addPage();

            // Optional: Redraw header on new page
            y = 36 + 10; // Top margin + spacing
            doc.fillColor(headerBgColor)
              .rect(leftX, y, tableWidth, headerHeight)
              .fill();
            doc.fillColor('#111').font('Helvetica-Bold').fontSize(12);
            doc.text('Segment Name', leftX + cellPadding, y + cellPadding, { width: colW1 });
            doc.text('Description', midX + cellPadding, y + cellPadding, { width: colW2 });
            doc.strokeColor(borderColor)
              .rect(leftX, y, tableWidth, headerHeight)
              .stroke();
            doc.moveTo(midX, y).lineTo(midX, y + headerHeight).stroke();

            y += headerHeight;
          }

          // Draw cell background (optional: alternate row colors)
          // doc.fillColor(idx % 2 === 0 ? '#FAFAFA' : '#FFFFFF').rect(leftX, y, tableWidth, rowHeight).fill();

          // Draw text
          doc.fillColor('#000').fontSize(12);
          doc.text(String(name), leftX + cellPadding, y + cellPadding, {
            width: colW1 - 2 * cellPadding,
            lineBreak: true
          });

          doc.fontSize(10).fillColor('#333');
          doc.text(String(desc), midX + cellPadding, y + cellPadding, {
            width: colW2 - 2 * cellPadding,
            lineBreak: true
          });

          // Draw borders
          doc.strokeColor(borderColor)
            .rect(leftX, y, tableWidth, rowHeight)
            .stroke();
          doc.moveTo(midX, y).lineTo(midX, y + rowHeight).stroke();

          y += rowHeight;
        });

        // Final bottom line
        doc.moveTo(leftX, y).lineTo(rightX, y).stroke();

        // Reset defaults
        doc.fillColor('#000').strokeColor('#000').lineWidth(1);
      }

      // KPI cards (compact grid)
    const k = report.kpis || {};
    const cards = [
      { title: 'Total Customers', value: k.totalCustomers ?? '—' },
      { title: 'Total Revenue', value: k.totalRevenue ?? '—' },
      { title: 'Average Spend', value: k.averageSpendOverall ?? '—' },
      { title: 'Average Days Since Last Purchase', value: k.overallAvgRecency ?? '—' },
      { title: 'Average Purchases Per Month', value: k.overallAvgFrequency ?? '—' },
    ];

    doc.moveDown(1.0);
    // Ensure heading is centered relative to content area
    const headingX = 36;
    const headingWidth = doc.page.width - 72;
    doc.font('Helvetica-Bold').fontSize(14).text('Key Metrics', headingX, doc.y, { width: headingWidth, align: 'center' });
    doc.moveDown(0.5);

    const cardWidth = 170;        // Smaller card
    const cardHeight = 55;        // Compact height
    const horizontalGap = 20;
    const verticalGap = 16;
    const cardsPerRow = 3;        // Fits nicely on A4 with margins
    const margin = 36;            // Page margin used when creating PDF
    const contentWidth = doc.page.width - margin * 2;
    const startY = doc.y;

    // Helper to center a row with N items
    const centerXForRow = (items) => {
      const rowWidth = items * cardWidth + (items - 1) * horizontalGap;
      return margin + Math.max(0, (contentWidth - rowWidth) / 2);
    };

    let y = startY;
    cards.forEach((card, index) => {
      const inRowIndex = index % cardsPerRow;
      const isRowStart = inRowIndex === 0;
      const itemsThisRow = Math.min(cardsPerRow, cards.length - index);

      // Move to next row (except on very first)
      if (index > 0 && isRowStart) {
        y += cardHeight + verticalGap;
      }

      // Page break check before drawing new row
      if (isRowStart && y + cardHeight > doc.page.height - 72) {
        doc.addPage();
        y = margin; // reset to top margin
      }

      // Compute x for this card, centered per row
      const rowStartX = centerXForRow(itemsThisRow);
      const x = rowStartX + inRowIndex * (cardWidth + horizontalGap);

      // Card background + border
      doc.roundedRect(x, y, cardWidth, cardHeight, 8)
        .fillAndStroke('#F8FAFC', '#E2E8F0');

      // Title (fit to width by reducing font size if needed)
      doc.fillColor('#374151').font('Helvetica-Bold');
      let titleFont = 10;
      const titleMax = 10;
      const titleMin = 8;
      const titleBox = cardWidth - 24;
      while (titleFont > titleMin && doc.widthOfString(String(card.title), { font: 'Helvetica-Bold', size: titleFont }) > titleBox) {
        titleFont -= 1;
      }
      doc.fontSize(titleFont).text(String(card.title), x + 12, y + 10, {
        width: titleBox,
        lineBreak: true,
        ellipsis: true
      });

      // Value
      const valueText = typeof card.value === 'number'
        ? Number(card.value).toLocaleString(undefined, { maximumFractionDigits: 2 })
        : String(card.value);

      // Value (shrink-to-fit then ellipsis)
      doc.fillColor('#11142D').font('Helvetica-Bold');
      let valueFont = 16;
      const valueMin = 10;
      const valueBox = cardWidth - 24;
      while (valueFont > valueMin && doc.widthOfString(String(valueText), { font: 'Helvetica-Bold', size: valueFont }) > valueBox) {
        valueFont -= 1;
      }
      doc.fontSize(valueFont).text(String(valueText), x + 12, y + 28, {
        width: valueBox,
        lineBreak: false,
        ellipsis: true
      });
    });

    // Reset fill color for rest of document
    doc.fillColor('#000');
// ============Images ============
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
