import datasetModel from '../models/datasetModel.js';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const uploadDataset = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { userId } = req;
    const { type } = req.params;
    const { originalname, filename } = req.file;

    // Capitalize type (e.g., "customer" → "Customer")
    const formattedType = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();

    // Save to MongoDB
    const newDataset = await datasetModel.create({
      filename,
      originalname,
      user: userId,
      type: formattedType,
    });

    return res.status(200).json({
      success: true,
      message: 'Dataset uploaded and saved successfully',
      data: newDataset,
    });

  } catch (error) {
    console.error('🔥 Error saving dataset to MongoDB:', error);
    return res.status(500).json({ success: false, message: 'Server error during dataset upload' });
  }
};

export const getUserDatasets = async (req, res) => {
  try {
    const userId = req.userId;

    const allDatasets = await datasetModel.find({ user: userId }).sort({ uploadedAt: -1 });

    const customer = allDatasets.filter(ds => ds.type === 'Customer');
    const product = allDatasets.filter(ds => ds.type === 'Product');

    res.json({ success: true, customer, product });
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
    // console.log('Deleting file at:', filePath);

    try {
      await fs.unlink(filePath);
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
console.log('User ID:', userId);
    const customerCount = await datasetModel.countDocuments({ type: 'Customer', user: userId });
    const productCount = await datasetModel.countDocuments({ type: 'Product', user: userId });

console.log('Customer Count:', customerCount);
console.log('Product Count:', productCount);
    res.json({
      success: true,
      counts: {
        customer: customerCount,
        product: productCount,
        total: customerCount + productCount
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

    const filePath = path.join('uploads', dataset.filename);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const lines = fileContent.split('\n').slice(0, 10); // preview first 10 lines

    res.json({ success: true, preview: lines });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};