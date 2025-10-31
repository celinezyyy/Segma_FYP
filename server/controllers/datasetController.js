import datasetModel from '../models/datasetModel.js';
import datasetTemplate from '../models/datasetTemplateModel.js';
import path from 'path';
import csvParser from 'csv-parser';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';
import { getGridFSBucket } from '../utils/gridfs.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// UPDATE THE COLUMN HERE(only customer column need to modify), OPTIONAL & MANDATORY COLUMNS
export const uploadDataset = async (req, res) => {
  try {
    const bucket = getGridFSBucket();
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { userId } = req;
    const { type } = req.params;
    const { originalname } = req.file;

    const formattedType = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();

    const expectedHeaders = {
      Customer: ['CustomerID', 'Date of Birth', 'Gender', 'City', 'State'],
      Order: [
        'OrderID',
        'CustomerID',
        'Purchase Item',
        'Purchase Date',
        'Item Price',
        'Purchase Quantity',
        'Total Spend',
        'Transaction Method'
      ]
    };

    const required = expectedHeaders[formattedType];
    if (!required) {
      console.log('Invalid dataset type');
      return res.status(400).json({ success: false, message: 'Invalid dataset type' });
    }

    // --- Parse CSV headers ---
    const stream = Readable.from(req.file.buffer);
    const headers = await new Promise((resolve, reject) => {
      stream
        .pipe(csvParser())
        .on('headers', (headers) => {
          // Remove BOM and trim
          const cleaned = headers.map(h => h.trim().replace(/^\uFEFF/, ''));
          console.log('Headers received:', cleaned);
          resolve(cleaned); // ✅ Use cleaned headers
        })
        .on('error', reject);
    });

    // --- Compare headers ---
    const missing = required.filter(col => !headers.includes(col));
    const extra = headers.filter(col => !required.includes(col));

    if (missing.length > 0 || extra.length > 0) {
      console.log('Missing columns:', missing);
      console.log('Extra columns:', extra);

      let htmlMsg = '<div style="text-align:left;">';

      if (missing.length > 0) {
        htmlMsg += `<p><b>Missing required columns:</b></p><ul>${missing.map(c => `<li>${c}</li>`).join('')}</ul>`;
      }

      if (extra.length > 0) {
        htmlMsg += `<p><b>Unexpected extra columns found:</b></p><ul>${extra.map(c => `<li>${c}</li>`).join('')}</ul>`;
      }

      htmlMsg += '</div>';

      return res.status(400).json({
        success: false,
        message: htmlMsg, // return ready-to-render HTML
      });
    }

    // --- Save valid dataset ---
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.csv`;
    const uploadStream = bucket.openUploadStream(filename, {
      metadata: { user: userId, type: formattedType, originalname }
    });

    await new Promise((resolve, reject) => {
      Readable.from(req.file.buffer)
        .pipe(uploadStream)
        .on('error', reject)
        .on('finish', resolve);
    });

    // Save to DB
    const newDataset = await datasetModel.create({
      filename,
      originalname,
      user: userId,
      type: formattedType,
      isClean: false,
      fileId: uploadStream.id
    });

    console.log('Dataset saved to DB and gridfs');

    return res.status(200).json({
      success: true,
      message: 'Dataset uploaded and validated successfully',
      data: newDataset,
    });

  } catch (error) {
    console.error('Error in uploadDataset:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during dataset upload',
    });
  }
};


export const getUserDatasets = async (req, res) => {
  try {
    const userId = req.userId;

    const allDatasets = await datasetModel.find({ user: userId }).sort({ uploadedAt: -1 });

    const customer = allDatasets.filter(ds => ds.type === 'Customer');
    const order = allDatasets.filter(ds => ds.type === 'Order');

    res.json({ success: true, customer, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteDataset = async (req, res) => {
  try {
    const dataset = await datasetModel.findById(req.params.id);
    if (!dataset)
      return res.status(404).json({ success: false, message: 'Dataset not found' });

    const filePath = path.join(__dirname, '..', 'datasets', dataset.user.toString(), dataset.type, dataset.filename);

    try {
      // await fsp.unlink(filePath);
      const bucket = getGridFSBucket();
      const file = await bucket.find({ filename: dataset.filename }).toArray();

      if (file.length > 0) {
        await bucket.delete(file[0]._id);
      } else {
        console.warn('⚠️ File already missing in GridFS');
      }
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error('File deletion error:', err);
        return res.status(500).json({ success: false, message: 'Failed to delete file from disk' });
      }
      console.warn('File already missing on disk.');
    }

    await datasetModel.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Dataset deleted successfully' });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getDatasetCounts = async (req, res) => {
  try {
    const userId = req.userId; 

    const customerCount = await datasetModel.countDocuments({ type: 'Customer', user: userId });
    const orderCount = await datasetModel.countDocuments({ type: 'Order', user: userId });

    res.json({
      success: true,
      counts: {
        customer: customerCount,
        order: orderCount,
      }
    });
  } catch (err) {
    console.error('Failed to fetch dataset counts:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const previewDataset = async (req, res) => {
  try {
    const datasetId = req.params.id;
    const userId = req.userId;

    const dataset = await datasetModel.findOne({ _id: datasetId, user: userId });
    if (!dataset) return res.status(404).json({ success: false, message: 'Dataset not found' });

    const bucket = getGridFSBucket();
    const stream = bucket.openDownloadStreamByName(dataset.filename);

    const rows = [];
    let rowIndex = 0;

    await new Promise((resolve, reject) => {
      stream
        .pipe(csvParser())
        .on('data', (row) => {
          rows.push(row);
        })
        .on('end', resolve)
        .on('error', reject);
    });

    return res.status(200).json({ success: true, preview: rows.slice(0, 100) }); // send up to 100 rows
  } catch (error) {
    console.error('🔥 Error in previewDataset:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get template by type
export const getDatasetTemplate = async (req, res) => {
  try {
    const { type } = req.params; // "customer" or "order"
    const template = await datasetTemplate.findOne({ type });

    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${template.fileName}"`);
    res.setHeader('Content-Type', template.mimetype);
    res.send(template.data); // send raw buffer
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};
