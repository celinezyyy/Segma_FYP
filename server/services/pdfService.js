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
      const doc = new PDFDocument({ size: 'A4', layout: 'portrait', margin: 36 });
      const filename = makeUniqueFilename(report);

      const bucket = getReportsBucket();
      const uploadStream = bucket.openUploadStream(filename, {
        contentType: 'application/pdf'
      });

      // Pipe PDF into GridFS
      doc.pipe(uploadStream);

      // ===================== PDF Header =====================
      doc.font('Helvetica-Bold').fontSize(20).text('Customer Segmentation Report', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor('#666').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown(1);
      doc.fillColor('#000');

      // ===================== Overview Dashboard =====================
      doc.font('Helvetica-Bold').fontSize(15)
        .text(`Customer Segmentation Dashboard Overview`, 36, doc.y, {
          width: doc.page.width - 72,
          underline: true,
          align: 'center'
        });
      doc.moveDown(1.0);
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

      // Segment Table
      const segments = Array.isArray(report.clusters) ? report.clusters : [];
      if (segments.length) {
        doc.moveDown(2.0);
        doc.font('Helvetica-Bold').fontSize(14)
          .text(`${segments.length} Customer Segments Found`, 36, doc.y, {
            width: doc.page.width - 72,
            align: 'center'
          });

        // Reduce top padding before the table by using a smaller offset
        const startY = doc.y + 10;
        const colW1 = 220;                    // Name column
        const colW2 = doc.page.width - 36 * 2 - colW1 - 12; // Description column (full remaining width)
        const tableWidth = colW1 + 12 + colW2;
        const leftX = 36;
        const midX = leftX + colW1 + 6;        // Vertical separator position
        const rightX = leftX + tableWidth;

        const borderColor = '#CCC';
        const headerBgColor = '#F0F0F0';       // Light gray background for header
        const cellPadding = 12;

        doc.lineWidth(0.5).strokeColor(borderColor);

        let y = startY;

        // === HEADER ROW ===
        // Header height: follow single-line body row height (fixed)
        doc.font('Helvetica-Bold').fontSize(13);
        const headerLineHeight = Math.max(
          doc.heightOfString('Segment Name', { width: colW1 - 2 * cellPadding, lineGap: 0 }),
          doc.heightOfString('Description', { width: colW2 - 2 * cellPadding, lineGap: 0 })
        );
        const headerHeight = headerLineHeight + 2 * cellPadding;
        const headerTextY = y + cellPadding;

        // Background fill for header
        doc.fillColor(headerBgColor)
          .rect(leftX, y, tableWidth, headerHeight)
          .fill();

        // Header text (bold, dark)
        doc.fillColor('#111').font('Helvetica-Bold').fontSize(12);
        doc.text('Segment Name', leftX + cellPadding, headerTextY, { width: colW1, lineBreak: false });
        doc.text('Description', midX + cellPadding, headerTextY, { width: colW2, lineBreak: false });

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

          // Measure heights using actual font sizes and a small line gap for readability
          doc.fontSize(12);
          const nameHeight = doc.heightOfString(String(name), {
            width: colW1 - 2 * cellPadding,
            lineGap: 2
          });
          doc.fontSize(10);
          const descHeight = doc.heightOfString(String(desc), {
            width: colW2 - 2 * cellPadding,
            lineGap: 2
          });
          doc.fontSize(12); // restore default for subsequent drawing

          const contentHeight = Math.max(nameHeight, descHeight);
          const rowHeight = contentHeight + 2 * cellPadding; // minimal padding

          // Page break check
          if (y + rowHeight > doc.page.height - 72) {
            doc.addPage();

            // Optional: Redraw header on new page
            y = 36 + 10; // Top margin + spacing
            doc.fillColor(headerBgColor)
              .rect(leftX, y, tableWidth, headerHeight)
              .fill();
            doc.fillColor('#111').font('Helvetica-Bold').fontSize(12);
            doc.text('Segment Name', leftX + cellPadding, y + cellPadding, { width: colW1, lineBreak: false });
            doc.text('Description', midX + cellPadding, y + cellPadding, { width: colW2, lineBreak: false });
            doc.strokeColor(borderColor)
              .rect(leftX, y, tableWidth, headerHeight)
              .stroke();
            doc.moveTo(midX, y).lineTo(midX, y + headerHeight).stroke();

            y += headerHeight;
          }

          // Draw text inside cells (explicit positions per row)
          doc.save();
          doc.fillColor('#000').fontSize(12);
          doc.text(String(name), leftX + cellPadding, y + cellPadding, {
            width: colW1 - 2 * cellPadding,
            align: 'left',
            lineBreak: true,
            lineGap: 2
          });

          doc.fontSize(12).fillColor('#333');
          doc.text(String(desc), midX + cellPadding, y + cellPadding, {
            width: colW2 - 2 * cellPadding,
            align: 'left',
            lineBreak: true,
            lineGap: 2
          });
          doc.restore();

          // Draw borders
          doc.strokeColor(borderColor)
            .rect(leftX, y, tableWidth, rowHeight)
            .stroke();
          doc.moveTo(midX, y).lineTo(midX, y + rowHeight).stroke();

          y += rowHeight;
        });

        // Final bottom line
        doc.moveTo(leftX, y).lineTo(rightX, y).stroke();
        doc.y = y + 24;
        // Reset defaults
        doc.fillColor('#000').strokeColor('#000').lineWidth(1);
      }

      // Image helpers (available before KPI/overview/segments rendering)
      const toBuffer = (img) => {
        if (!img) return null;
        const base64 = String(img).replace(/^data:image\/[a-zA-Z]+;base64,/, '');
        try { return Buffer.from(base64, 'base64'); } catch { return null; }
      };

      const addImagesPage = (imgs, captions) => {
        const valid = imgs.map(toBuffer).filter(Boolean);
        if (!valid.length) return;
        doc.addPage();
        const top = 36; // margin top
        const left = 36; // margin left
        const right = doc.page.width - 36; // margin right
        const bottom = doc.page.height - 36; // margin bottom
        const availableW = right - left;
        const availableH = bottom - top;
        const gap = 12;
        const rows = valid.length; // stack vertically
        const slotH = Math.floor((availableH - gap * (rows - 1)) / rows);

        valid.forEach((buf, i) => {
          const y = top + i * (slotH + gap);
          // Optional caption
          const caption = captions?.[i];
          let captionOffset = 0;
          if (caption) {
            doc.font('Helvetica-Bold').fontSize(12).text(String(caption), left, y, { width: availableW, align: 'left' });
            // restore default font for subsequent drawings
            doc.font('Helvetica');
            captionOffset = 18;
          }
          doc.image(buf, left, y + captionOffset, { fit: [availableW, slotH - captionOffset], align: 'center' });
          // Border around chart area
          doc.save().strokeColor('#E2E8F0').lineWidth(0.75)
            .roundedRect(left, y + captionOffset, availableW, Math.max(0, slotH - captionOffset), 6)
            .stroke().restore();
        });
      };

      // Draw a single image inline at current flow position; add page only if needed
      const addImageInline = (img, caption) => {
        const buf = toBuffer(img);
        if (!buf) return;
        const margin = 36;
        const left = margin;
        const contentW = doc.page.width - margin * 2;
        // Space left on current page
        const availableH = Math.max(0, (doc.page.height - margin) - doc.y);
        const captionOffset = caption ? 18 : 0;
        // If not enough space for a reasonable image height, go to new page
        if (availableH < 120) {
          doc.addPage();
        }
        const yStart = doc.y;
        if (caption) {
          doc.fontSize(12).text(String(caption), left, yStart, { width: contentW, align: 'left' });
        }
        const yImg = yStart + captionOffset;
        const fitW = contentW;
        const fitH = Math.max(120, (doc.page.height - margin) - yImg);
        doc.image(buf, left, yImg, { fit: [fitW, fitH], align: 'center' });
        // Advance flow to bottom of the reserved area (safe)
        doc.y = yImg + fitH + 12;
      };

      // KPI section: prefer client-rendered image if provided, else fallback to drawn cards
      const kpiImgs = Array.isArray(images?.kpi) ? images.kpi : (images?.kpi ? [images.kpi] : []);
      if (kpiImgs.length) {
        // Render KPI images inline after the table (no new page unless necessary)
        kpiImgs.forEach((img) => addImageInline(img));
      } else {
        // Fallback: draw KPI cards (legacy)
        const k = report.kpis || {};
        const cards = [
          { title: 'Total Customers', value: k.totalCustomers ?? '—' },
          { title: 'Total Revenue', value: k.totalRevenue ?? '—' },
          { title: 'Average Spend', value: k.averageSpendOverall ?? '—' },
          { title: 'Average Days Since Last Purchase', value: k.overallAvgRecency ?? '—' },
          { title: 'Average Purchases Per Month', value: k.overallAvgFrequency ?? '—' },
        ];

        doc.moveDown(2.0);

        const cardWidth = 165;        // Slightly smaller card width for portrait
        const cardHeight = 60;        // Card height
        const horizontalGap = 20;
        const verticalGap = 18;
        const margin = 36;            // Page margin used when creating PDF
        const contentWidth = doc.page.width - margin * 2;
        const startY = doc.y;
        // Determine max cards per row based on available width (portrait-safe)
        const maxPerRow = Math.max(1, Math.floor((contentWidth + horizontalGap) / (cardWidth + horizontalGap)));

        // Helper to center a row with N items
        const centerXForRow = (items) => {
          const rowWidth = items * cardWidth + (items - 1) * horizontalGap;
          return margin + Math.max(0, (contentWidth - rowWidth) / 2);
        };

        // Custom layout: 3 cards in first row, 2 in second row.
        const totalCards = cards.length;
        const row1Count = Math.min(3, totalCards);
        const row2Count = Math.max(0, totalCards - row1Count);

        let y = startY;
        const row1StartX = centerXForRow(row1Count);
        const row1Xs = Array.from({ length: row1Count }, (_, i) => row1StartX + i * (cardWidth + horizontalGap));

        // Render first row (up to 3 cards)
        for (let i = 0; i < row1Count; i++) {
          const card = cards[i];
          const x = row1Xs[i];
          // Card background + border
          doc.roundedRect(x, y, cardWidth, cardHeight, 8).fillAndStroke('#F8FAFC', '#E2E8F0');
          // Title shrink-to-fit
          doc.fillColor('#374151').font('Helvetica-Bold');
          let titleFont = 10;
          const titleMin = 8;
          const titleBox = cardWidth - 24;
          while (titleFont > titleMin && doc.widthOfString(String(card.title), { font: 'Helvetica-Bold', size: titleFont }) > titleBox) {
            titleFont -= 1;
          }
          doc.fontSize(titleFont).text(String(card.title), x + 12, y + 10, { width: titleBox, lineBreak: true, ellipsis: true });
          // Value shrink-to-fit
          const valueText = typeof card.value === 'number' ? Number(card.value).toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(card.value);
          doc.fillColor('#11142D').font('Helvetica-Bold');
          let valueFont = 16;
          const valueMin = 10;
          const valueBox = cardWidth - 24;
          while (valueFont > valueMin && doc.widthOfString(String(valueText), { font: 'Helvetica-Bold', size: valueFont }) > valueBox) {
            valueFont -= 1;
          }
          doc.fontSize(valueFont).text(String(valueText), x + 12, y + 28, { width: valueBox, lineBreak: false, ellipsis: true });
        }

        // Move to second row
        if (row2Count > 0) {
          let y2 = y + cardHeight + verticalGap;
          if (y2 + cardHeight > doc.page.height - 72) { doc.addPage(); y2 = margin; }

          // Compute second-row Xs: if exactly 2 cards under 3-card row, place them centered in the gaps between row1 cards
          let row2Xs;
          if (row1Count === 3 && row2Count === 2) {
            const gapCenters = [
              (row1Xs[0] + cardWidth + row1Xs[1]) / 2,
              (row1Xs[1] + cardWidth + row1Xs[2]) / 2,
            ];
            row2Xs = gapCenters.map(gc => gc - cardWidth / 2);
          } else {
            const row2StartX = centerXForRow(row2Count);
            row2Xs = Array.from({ length: row2Count }, (_, i) => row2StartX + i * (cardWidth + horizontalGap));
          }

          for (let j = 0; j < row2Count; j++) {
            const card = cards[row1Count + j];
            const x = row2Xs[j];
            doc.roundedRect(x, y2, cardWidth, cardHeight, 8).fillAndStroke('#F8FAFC', '#E2E8F0');
            // Title
            doc.fillColor('#374151').font('Helvetica-Bold');
            let titleFont = 10;
            const titleMin = 8;
            const titleBox = cardWidth - 24;
            while (titleFont > titleMin && doc.widthOfString(String(card.title), { font: 'Helvetica-Bold', size: titleFont }) > titleBox) {
              titleFont -= 1;
            }
            doc.fontSize(titleFont).text(String(card.title), x + 12, y2 + 10, { width: titleBox, lineBreak: true, ellipsis: true });
            // Value
            const valueText = typeof card.value === 'number' ? Number(card.value).toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(card.value);
            doc.fillColor('#11142D').font('Helvetica-Bold');
            let valueFont = 16;
            const valueMin = 10;
            const valueBox = cardWidth - 24;
            while (valueFont > valueMin && doc.widthOfString(String(valueText), { font: 'Helvetica-Bold', size: valueFont }) > valueBox) {
              valueFont -= 1;
            }
            doc.fontSize(valueFont).text(String(valueText), x + 12, y2 + 28, { width: valueBox, lineBreak: false, ellipsis: true });
          }
        }
        doc.fillColor('#000');
      }
  // ======================== Overview Charts ========================

      const overviewImgs = Array.isArray(images?.overview) ? images.overview : (images?.overview ? [images.overview] : []);
      const overviewCaptions = Array.isArray(images?.overviewCaptions) ? images.overviewCaptions : [];
      if (overviewImgs.length) {
        // Each overview image is already a composed page. Render one per PDF page.
        overviewImgs.forEach((img, i) => addImagesPage([img], [overviewCaptions[i]]));
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

      // ======================== Segment Cards =========================
      const segmentImgs = Array.isArray(images?.segments) ? images.segments : (images?.segments ? [images.segments] : []);
      if (segmentImgs.length) {
        segmentImgs.forEach((img) => addImagesPage([img]));
      } else {
        // Fallback: legacy text-based cluster details
        doc.addPage();
        const clusters = report.clusters || [];
        if (clusters.length) {
          doc.moveDown(1);
          clusters.forEach((c, idx) => {
            doc.addPage();
              doc.font('Helvetica-Bold').fontSize(15).text(`Customer Group Detailed Dashboard`, 36, doc.y, {
                width: doc.page.width - 72,
                underline: true,
                align: 'center'
              });
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
      }

      // ======================== Cluster Dashboards =========================
      const clusterDashImgs = Array.isArray(images?.clusterDashboards) ? images.clusterDashboards : (images?.clusterDashboards ? [images.clusterDashboards] : []);
      if (clusterDashImgs.length) {
        const captions = clusterDashImgs.map((_, i) => {
          const seg = segments?.[i];
          const name = seg?.suggestedName || (typeof seg?.cluster !== 'undefined' ? `Cluster ${seg.cluster}` : `Cluster ${i + 1}`);
          return `Customer Group ${i + 1} - \"${name}\"`;
        });

        // First cluster: draw section title and cluster 1 on the SAME page
        const firstBuf = toBuffer(clusterDashImgs[0]);
        if (firstBuf) {
          const margin = 36;
          const left = margin;
          const top = margin;
          const right = doc.page.width - margin;
          const bottom = doc.page.height - margin;
          const availableW = right - left;

          doc.addPage();
          // Section title (centered, underlined)
          doc.font('Helvetica-Bold').fontSize(15)
            .text('Customer Group Detailed Dashboard', left, top, {
              width: availableW,
              underline: true,
              align: 'center'
            });
          let y = doc.y + 12;
          // Caption for cluster 1 (bold)
          const cap0 = captions[0];
          if (cap0) {
            doc.font('Helvetica-Bold').fontSize(12).text(String(cap0), left, y, { width: availableW, align: 'left' });
            doc.font('Helvetica');
            y += 18;
          }
          const slotH = Math.max(0, bottom - y);
          if (slotH > 0) {
            doc.image(firstBuf, left, y, { fit: [availableW, slotH], align: 'center' });
            doc.save().strokeColor('#E2E8F0').lineWidth(0.75)
              .roundedRect(left, y, availableW, slotH, 6).stroke().restore();
          }
        }

        // Remaining clusters: one page per image with bold caption
        for (let i = 1; i < clusterDashImgs.length; i++) {
          addImagesPage([clusterDashImgs[i]], [captions[i]]);
        }
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
