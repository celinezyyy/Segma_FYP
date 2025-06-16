import datasetModel from '../models/datasetModel.js';
import path from 'path';
import fsp from 'fs/promises';
import fs from 'fs';
import csvParser from 'csv-parser';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const uploadDataset = async (req, res) => {
  try {
    if (!req.file) {
      console.log('No file found in request');
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { userId } = req;
    const { type } = req.params;
    const { originalname } = req.file;

    const formattedType = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();

    const expectedHeaders = {
      Customer: [
        'Customer_ID', 'Age', 'Gender', 'Income', 'Marital Status',
        'Occupation', 'Educational Level', 'Family Size', 'Nationality',
        'Zipcode', 'City', 'State', 'Country', 'Location'
      ],
      Order: [
        'Order_ID', 'Customer_ID', 'Purchase Item', 'Purchase Date', 'Purchase Time',
        'Purchase Channel', 'Total Spend', 'PurchaseQuantity', 'Transaction Method'
      ]
    };

    const required = expectedHeaders[formattedType];
    if (!required) {
      console.log('Invalid dataset type');
      return res.status(400).json({ success: false, message: 'Invalid dataset type' });
    }

    // Convert buffer to stream for csv-parser
    const stream = Readable.from(req.file.buffer);

    const headers = await new Promise((resolve, reject) => {
      stream
        .pipe(csvParser())
        .on('headers', (headers) => {
          console.log('Headers received:', headers);
          resolve(headers);
        })
        .on('error', (err) => {
          console.error('CSV parse error:', err);
          reject(err);
        });
    });

    const missing = required.filter((col) => !headers.includes(col));
    if (missing.length > 0) {
      console.log('Missing columns:', missing);
      return res.status(400).json({
        success: false,
        message: `Missing required columns: ${missing.join(', ')}`,
      });
    }

    // Save to disk AFTER validation
    const filename = Date.now() + '-' + Math.round(Math.random() * 1e9) + '.csv';
    const savePath = path.join('datasets', userId, type);
    await fsp.mkdir(savePath, { recursive: true });

    const fullFilePath = path.join(savePath, filename);
    await fsp.writeFile(fullFilePath, req.file.buffer);

    // Save to DB
    const newDataset = await datasetModel.create({
      filename,
      originalname,
      user: userId,
      type: formattedType,
    });

    console.log('Dataset saved to DB and local disk');

    return res.status(200).json({
      success: true,
      message: 'Dataset uploaded and validated successfully',
      data: newDataset,
    });

  } catch (error) {
    console.error('🔥 Unexpected error in uploadDataset:', error);
    return res.status(500).json({ success: false, message: 'Server error during dataset upload' });
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
      await fsp.unlink(filePath);
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

    const filePath = path.join(__dirname, '..', 'datasets', userId, dataset.type, dataset.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    const rows = [];
    let rowIndex = 0;

    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on('data', (row) => {
          if (rowIndex === 0) {
            // Skip the 2nd line (which will be read as first row of data)
            rowIndex++;
            return;
          }
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
