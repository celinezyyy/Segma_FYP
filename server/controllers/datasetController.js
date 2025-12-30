import datasetModel from '../models/datasetModel.js';
import segmentationModel from '../models/segmentationModel.js';
import datasetTemplate from '../models/datasetTemplateModel.js';
import path from 'path';
import csvParser from 'csv-parser';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';
import { getGridFSBucket } from '../utils/gridfs.js';
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const uploadDataset = async (req, res) => {
  try {
    const bucket = getGridFSBucket();
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { userId } = req;
    const { type } = req.params;
    const { originalname } = req.file;
    const ext = path.extname(originalname || '').toLowerCase();

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

    // --- Parse headers (CSV or XLSX) ---
    let headers = [];
    let contentBuffer = null; // what we'll save to GridFS (always CSV)
    if (ext === '.xlsx') {
      try {
        const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
        const rawHeaders = Array.isArray(rows) && rows.length ? rows[0] : [];
        headers = rawHeaders.map(h => String(h ?? '').trim().replace(/^\uFEFF/, ''));
        console.log('Headers received (xlsx):', headers);
        // Convert sheet to CSV string and buffer for storage
        const csvText = XLSX.utils.sheet_to_csv(ws);
        contentBuffer = Buffer.from(csvText, 'utf-8');
      } catch (e) {
        console.error('Failed to parse XLSX:', e);
        return res.status(400).json({ success: false, message: 'Invalid .xlsx file' });
      }
    } else {
      // default assume CSV
      const stream = Readable.from(req.file.buffer);
      headers = await new Promise((resolve, reject) => {
        stream
          .pipe(csvParser())
          .on('headers', (headers) => {
            const cleaned = headers.map(h => h.trim().replace(/^\uFEFF/, ''));
            console.log('Headers received (csv):', cleaned);
            resolve(cleaned);
          })
          .on('error', reject);
      });
      contentBuffer = req.file.buffer;
    }

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

      htmlMsg += '</div>';

      return res.status(400).json({
        success: false,
        message: htmlMsg, // return ready-to-render HTML
      });
    }

    // --- Save valid dataset (always store as CSV) ---
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.csv`;
    const uploadStream = bucket.openUploadStream(filename);

    await new Promise((resolve, reject) => {
      Readable.from(contentBuffer)
        .pipe(uploadStream)
        .on('error', reject)
        .on('finish', resolve);
    });

    // Save to DB
    const baseOriginal = path.parse(originalname || 'dataset').name;
    const normalizedOriginalname = `${baseOriginal}.csv`;
    const newDataset = await datasetModel.create({
      filename,
      originalname: normalizedOriginalname,
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

    // Initialize GridFS bucket once for this operation
    const bucket = getGridFSBucket();

    try {
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

    // === Cascade delete segmentation records that depend on this dataset ===
    try {
      const segFilter = { $or: [ { customerDatasetId: dataset._id }, { orderDatasetId: dataset._id } ] };
      const segRecords = await segmentationModel.find(segFilter, { _id: 1, mergedFileId: 1 }).lean();

      for (const seg of segRecords) {
        if (seg.mergedFileId) {
          try {
            await bucket.delete(seg.mergedFileId);
          } catch (e) {
            console.warn('⚠️ Failed deleting merged GridFS file', e?.message);
          }
        }
      }
      if (segRecords.length) {
        await segmentationModel.deleteMany(segFilter);
      }
      console.log(`[INFO] Cascaded deletion: removed ${segRecords.length} segmentation records and their merged CSV files`);
    } catch (cascadeErr) {
      console.warn('Cascade delete warning:', cascadeErr?.message);
    }

    await datasetModel.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Dataset deleted successfully (with cascaded segmentation cleanup)' });

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

export const getDatasetCleanStatus = async (req, res) => {
  try {
    if (!req.params.datasetId) {
      return res.status(400).json({ success: false, message: 'Dataset ID is required' });
    }
    
    const dataset = await datasetModel.findById(req.params.datasetId);
    if (!dataset) 
      return res.status(404).json({ success: false, message: 'Dataset not found' });

    res.json({
      success: true,
      isClean: dataset.isClean,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Handle dataset cleaning process
export const startDatasetCleaning = async (req, res) => {
  try {
    const io = req.app.get('io');
    const { customerDatasetId, orderDatasetId } = req.body;
    const userId = req.userId;
    const bucket = getGridFSBucket();

    const datasetId = customerDatasetId || orderDatasetId;
    const type = customerDatasetId ? 'Customer' : 'Order';

    if (!datasetId) {
      return res.status(400).json({ success: false, message: 'No dataset ID provided.' });
    }

    // Fetch dataset document
    const dataset = await datasetModel.findOne({ _id: datasetId, user: userId });
    if (!dataset) {
      return res.status(404).json({ success: false, message: `${type} dataset not found.` });
    }

    // Prepare temp directory & file paths
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) 
      fs.mkdirSync(tempDir, { recursive: true });

    const tempFilePath = path.join(tempDir, dataset.filename);
    // Step A: Download dataset from GridFS (emit progress)
    io?.to(userId).emit("cleaning-progress", { stage: "read", message: "Downloading dataset..." , progress:5 });
    await new Promise((resolve, reject) => {
      const downloadStream = bucket.openDownloadStream(dataset.fileId);
      const writeStream = fs.createWriteStream(tempFilePath);
      downloadStream.pipe(writeStream)
        .on('error', (err) => reject(err))
        .on('finish', () => resolve());
    });

    // Step B: Spawn Python cleaning process (emit stage updates according to stdout or custom mapping)
    const pythonScript = path.join(__dirname, '../python/cleaningPipeline/cleaning_main.py');

    // Emit: start
    io?.to(userId).emit("cleaning-progress", { stage: "analyze", message: "Analyzing and clean your dataset", progress: 85});

    const py = spawn('python', [
      '-u',
      pythonScript,
      '--type', type.toLowerCase(),
      '--temp_file_path_with_filename', tempFilePath,
      '--original_file_name', dataset.originalname
    ], {
      stdio: 'inherit',
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });

    // wait for python to exit
    const exitCode = await new Promise((resolve, reject) => {
      py.on('close', (code) => {
        if (code === 0) resolve(0);
        else reject(new Error(`Python cleaning failed with exit code ${code}`));
      });
    });

    // Step C: After python success, upload cleaned csv and report
    // derive base names
    const baseName = path.parse(dataset.originalname).name;
    const ext = path.parse(dataset.originalname).ext;
    const cleanedOriFilename = `${baseName}_cleaned${ext}`;
    const cleanedFilePath = path.join(tempDir, cleanedOriFilename);
    const reportFilePath = path.join(tempDir, `${baseName}_report.json`);

    io?.to(userId).emit("cleaning-progress", { stage: "upload", message: "Uploading cleaned file...", progress: 95 });

    // ensure files exist
    if (!fs.existsSync(cleanedFilePath)) throw new Error('Cleaned file not found after Python run');
    if (!fs.existsSync(reportFilePath)) throw new Error('Report file not found after Python run');

    const cleanedFileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}.csv`;
    // Upload cleaned dataset back to GridFS using the original filename
    const uploadStream = bucket.openUploadStream(cleanedFileName);

    await new Promise((resolve, reject) => {
      fs.createReadStream(cleanedFilePath)
        .pipe(uploadStream)
        .on('error', (err) => reject(err))
        .on('finish', () => resolve());
    });

    // read the report JSON and parse it
    const reportRaw = fs.readFileSync(reportFilePath, 'utf-8');
    let report;
    try {
      report = JSON.parse(reportRaw);
    } catch (err) {
      report = { parseError: String(err), raw: reportRaw };
    }

    // Update dataset document with new fileId
    await datasetModel.findByIdAndUpdate(datasetId, {
      filename: cleanedFileName,
      originalname: cleanedOriFilename,
      user: userId,
      type: type,
      isClean: true,
      fileId: uploadStream.id,
      metadata: {
        ...(dataset.metadata || {}),
        data_quality_report: report
      }
    });

    // Delete original file from GridFS
    await bucket.delete(dataset.fileId);
    console.log(`[INFO] Original dataset file ${dataset.filename} deleted from GridFS`);

    io?.to(userId).emit("cleaning-progress", { stage: "done", message: "Cleaning complete!", progress: 100, reportSaved: true });

    // cleanup temp files
    try {
      fs.unlinkSync(tempFilePath);
      fs.unlinkSync(cleanedFilePath);
      fs.unlinkSync(reportFilePath);
      console.log('[INFO] Temp files cleaned up');
    } catch (e) {
      console.warn('Temp cleanup warning', e);
    }
    return res.json({ success: true, message: `${type} dataset cleaned successfully.`, report });
    // res.json({ success: true, message: `${type} dataset cleaned and replaced successfully.` });

  } catch (error) {
    console.error('Error in startDatasetCleaning:', error);
    // try to emit failed progress
    const io = req.app.get('io');
    io?.to(req.userId).emit('cleaning-progress', { progress: 0, message: 'Cleaning failed', error: error.message });
    return res.status(500).json({ success: false, message: error.message });
    // res.status(500).json({ success: false, message: error.message });
  }
};

export const getDatasetReport = async (req, res) => {
  try {
    const { datasetId } = req.params;
    if (!datasetId) {
      return res.status(400).json({ success: false, message: 'Dataset ID not provided' });
    }
    
    const dataset = await datasetModel.findOne({ _id: datasetId});

    if (!dataset)
      return res.status(404).json({ success: false, message: "Dataset not found" });

    const report = dataset.metadata?.data_quality_report;
    return res.json({ success: true, report });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Download cleaned dataset
export const downloadCleanedDataset = async (req, res) => {
  try {
    const { datasetId } = req.params;
    const userId = req.userId;

    console.log('[DOWNLOAD] Request received for datasetId:', datasetId);
    console.log('[DOWNLOAD] UserId:', userId);

    if (!datasetId) {
      return res.status(400).json({ success: false, message: 'Dataset ID not provided' });
    }

    // Find dataset and verify ownership
    const dataset = await datasetModel.findOne({ _id: datasetId, user: userId });
    console.log('[DOWNLOAD] Dataset found:', dataset ? 'Yes' : 'No');
    
    if (!dataset) {
      return res.status(404).json({ success: false, message: "Dataset not found or unauthorized" });
    }

    // Check if dataset is cleaned
    console.log('[DOWNLOAD] isClean:', dataset.isClean);
    if (!dataset.isClean) {
      return res.status(400).json({ success: false, message: "Dataset is not cleaned yet" });
    }

    // Stream file from GridFS
    const bucket = getGridFSBucket();
    console.log('[DOWNLOAD] Opening download stream for fileId:', dataset.fileId);
    
    const downloadStream = bucket.openDownloadStream(dataset.fileId);

    // Set response headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${dataset.originalname}"`);

    // Handle stream errors
    downloadStream.on('error', (error) => {
      console.error('[DOWNLOAD] Stream error:', error);
      if (!res.headersSent) {
        return res.status(500).json({ success: false, message: 'Error downloading file' });
      }
    });

    downloadStream.on('end', () => {
      console.log('[DOWNLOAD] Download completed successfully');
    });

    // Pipe the file to response
    downloadStream.pipe(res);

  } catch (error) {
    console.error('[DOWNLOAD] Error:', error);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
};
