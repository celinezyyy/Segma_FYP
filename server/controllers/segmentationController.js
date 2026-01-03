import datasetModel from '../models/datasetModel.js';
import segmentationModel from '../models/segmentationModel.js';
import { getGridFSBucket } from '../utils/gridfs.js';
import csvParser from 'csv-parser';
import { Readable } from 'stream';
import segmentationPairs from '../utils/segmentationPairs.js';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { stringify as csvStringify } from 'csv-stringify/sync';

// Merge dataset
const aggregateOrderData = (orderRows) => {
  const customerOrders = {};

  // Loop through each order row
  orderRows.forEach(row => {
    const customerId = row['customerid'];
    
    // If this is the first order for this customer, initialize their data
    if (!customerOrders[customerId]) {
      customerOrders[customerId] = {
        orders: [],              // Store all raw orders
        totalSpend: 0,           // Sum of all 'total spend'
        totalOrders: 0,          // Count of orders
        purchaseDates: [],       // Array of purchase dates for recency calculation
        items: [],               // Array of items purchased
      };
    }

    // Extract values from the row (all lowercase column names from cleaning)
    const spend = parseFloat(row['total spend']) || 0;  // Convert to number, default to 0
    const purchaseDate = row['purchase date'];  // Format: YYYY-MM-DD from cleaning
    const item = row['purchase item'];
    const purchaseTime = row['purchase time']; // Optional: derived by cleaning if time info exists

    // Add this order to the customer's order history
    customerOrders[customerId].orders.push(row);
    
    // Add to total spend (accumulate all orders)
    customerOrders[customerId].totalSpend += spend;
    
    // Increment order count
    customerOrders[customerId].totalOrders += 1;
    
    // Collect purchase dates (for recency calculation later)
    if (purchaseDate) {
      customerOrders[customerId].purchaseDates.push(new Date(purchaseDate));
    }
    
    // Collect items purchased (to find favorite item later)
    if (item) {
      customerOrders[customerId].items.push(item);
    }

    // Collect purchase time if available (e.g., "14:35:00")
    if (purchaseTime) {
      if (!customerOrders[customerId].purchaseTimes) 
        customerOrders[customerId].purchaseTimes = [];
      customerOrders[customerId].purchaseTimes.push(purchaseTime);
    }
  });

  // Now calculate derived metrics (RFM, averages, etc.) for each customer
  const aggregatedData = {};
  
  Object.keys(customerOrders).forEach(customerId => {
    const data = customerOrders[customerId];
    
    // Sort dates: most recent first (newest to oldest)
    const dates = data.purchaseDates.sort((a, b) => b - a);

    let recency = null;
    let customerLifetimeMonths = 0;

    if (dates.length > 0) {
      const lastPurchaseDate = dates[0];
      const firstPurchaseDate = dates[dates.length - 1];
      const now = new Date();

      recency = Math.floor((now - lastPurchaseDate) / (1000 * 60 * 60 * 24));

      const diffTime = lastPurchaseDate - firstPurchaseDate;
      customerLifetimeMonths = Math.max(
        1,
        Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30))
      );
    }

    // === CALCULATE AVERAGE ORDER VALUE ===
    // Total spend divided by number of orders
    const avgOrderValue = data.totalOrders > 0 ? data.totalSpend / data.totalOrders : 0;

    // === FIND FAVORITE ITEM ===
    // Count how many times each item was purchased
    const itemCounts = {};
    data.items.forEach(item => {
      itemCounts[item] = (itemCounts[item] || 0) + 1;
    });

    // Find the item with highest count
    const favoriteItem = Object.keys(itemCounts).length > 0
      ? Object.keys(itemCounts).reduce((a, b) => 
          itemCounts[a] > itemCounts[b] ? a : b
        )
      : null;

    // === DERIVE PURCHASE TIME PREFERENCES (OPTIONAL) ===
    // Compute favorite purchase hour (0-23) and day-part if times exist
    let favoritePurchaseHour = null;
    let favoriteDayPart = null;
    if (data.purchaseTimes.length > 0) {
      const hourCounts = {};
      const dayPartCounts = { Night: 0, Morning: 0, Afternoon: 0, Evening: 0 };

      const toDayPart = (h) => {
        if (h >= 0 && h <= 5) return 'Night';
        if (h >= 6 && h <= 11) return 'Morning';
        if (h >= 12 && h <= 17) return 'Afternoon';
        return 'Evening';
      };

      data.purchaseTimes.forEach(t => {
        // Expect format HH:MM or HH:MM:SS
        const parts = String(t).split(':');
        const h = parseInt(parts[0], 10);
        if (!isNaN(h) && h >= 0 && h <= 23) {
          hourCounts[h] = (hourCounts[h] || 0) + 1;
          const dp = toDayPart(h);
          dayPartCounts[dp] = (dayPartCounts[dp] || 0) + 1;
        }
      });

      // Determine most frequent hour and day-part
      const hourKeys = Object.keys(hourCounts);
      if (hourKeys.length > 0) {
        favoritePurchaseHour = parseInt(hourKeys.reduce((a, b) => (hourCounts[a] > hourCounts[b] ? a : b)) ,10);
      }
      favoriteDayPart = Object.keys(dayPartCounts).reduce((a, b) => (dayPartCounts[a] > dayPartCounts[b] ? a : b));
    }

    // Store all calculated metrics for this customer
    aggregatedData[customerId] = {
      customerid: customerId,  // Keep lowercase to match cleaned data
      
      // === BEHAVIORAL METRICS ===
      totalOrders: data.totalOrders,
      avgOrderValue: parseFloat(avgOrderValue.toFixed(2)),
      customerLifetimeMonths: customerLifetimeMonths || 0, // Months active between first and last purchase.
      favoriteItem: favoriteItem,
      favoritePurchaseHour: favoritePurchaseHour,   // Optional, integer 0-23
      favoriteDayPart: favoriteDayPart,             // Optional, one of Night/Morning/Afternoon/Evening
      
      // === RFM COMPONENTS (for RFM segmentation) ===
      recency: recency,      // R: Days since last purchase (lower is better)
      // F: Orders per month (normalized by customer lifetime)
      frequency: data.customerLifetimeMonths > 0 
        ? parseFloat((data.totalOrders / data.customerLifetimeMonths).toFixed(2)) 
        : data.totalOrders,
      monetary: parseFloat(data.totalSpend.toFixed(2)),  // M: Total spend (higher is better)
    };
  });

  return aggregatedData;
};

const mergeCustomerAndOrderData = (customerRows, aggregatedOrderData) => {
  const mergedData = [];

  // === CHECK WHICH OPTIONAL COLUMNS EXIST IN CLEANED CUSTOMER DATASET ===
  // Look at the first row to see which columns are present
  const sampleCustomer = customerRows[0] || {};
  // Support both underscore and hyphen variants from cleaning outputs
  const hasAgeColumn = 'age' in sampleCustomer;
  const hasAgeGroupColumn = ('age group' in sampleCustomer);
  const hasGenderColumn = 'gender' in sampleCustomer;

  console.log('[LOG - MERGE] Column availability check:');
  console.log(`  - age: ${hasAgeColumn}`);
  console.log(`  - age group: ${hasAgeGroupColumn}`);
  console.log(`  - gender: ${hasGenderColumn}`);

  customerRows.forEach(customer => {
    // Get customer ID (lowercase from cleaning)
    const customerId = customer['customerid'];
    
    // Find this customer's behavioral data (or empty object if no orders)
    const orderData = aggregatedOrderData[customerId] || {};

    // === CREATE MERGED CUSTOMER PROFILE ===
    // Start with mandatory fields (always present)
    const mergedCustomer = {
      // === IDENTIFICATION ===
      CustomerId: customerId,
      
      // === GEOGRAPHIC DATA (always present) ===
      City: customer['city'] || null,
      State: customer['state'] || null,
      
      // === BEHAVIORAL DATA FROM ORDERS ===
      TotalOrders: orderData.totalOrders || 0,
      AvgOrderValue: orderData.avgOrderValue || 0,
      CustomerLifetimeMonths: orderData.customerLifetimeMonths || 0,
      FavoriteItem: orderData.favoriteItem || null,
      FavoritePurchaseHour: orderData.favoritePurchaseHour ?? null,
      FavoriteDayPart: orderData.favoriteDayPart ?? null,
      
      // === RFM SCORES (for RFM segmentation) ===
      Recency: orderData.recency || null,
      Frequency: orderData.frequency || 0,
      Monetary: orderData.monetary || 0,
    };

    if (hasAgeGroupColumn) {
      // Prefer underscore if present, else fallback to hyphen variant
      const ageGroupValue = customer['age group'];
      if (ageGroupValue && ageGroupValue !== 'Unknown') {
        mergedCustomer.AgeGroup = ageGroupValue;
      } else {
        mergedCustomer.AgeGroup = null; // mark as truly missing
      }
    }

    if (hasGenderColumn) {
      const genderValue = customer['gender'];
      if (genderValue && genderValue !== 'Unknown') {
        mergedCustomer.Gender = genderValue;
      } else {
        mergedCustomer.Gender = null; // mark as missing for accurate summary
      }
    }
    mergedData.push(mergedCustomer);
  });

  return mergedData;
};

export const prepareSegmentationData = async (req, res) => {
  console.log('>>>>>>>>>>>>>>>>>>>>>>>>>> ENTRY: prepareSegmentationData function >>>>>>>>>>>>>>>>>>>>>>>>');
  try {
    const { userId } = req;
    const { customerDatasetId, orderDatasetId } = req.body;

    console.log('[LOG - STEP 0: STAGE PREPARE MERGING] Preparing segmentation data...');
    console.log('[LOG - STEP 0: STAGE PREPARE MERGING] User ID:', userId);
    console.log('[LOG - STEP 0: STAGE PREPARE MERGING] Customer Dataset ID:', customerDatasetId);
    console.log('[LOG - STEP 0: STAGE PREPARE MERGING] Order Dataset ID:', orderDatasetId);

    // Validate that both datasets exist and belong to user
    const customerDataset = await datasetModel.findOne({ 
      _id: customerDatasetId, 
      user: userId,
      type: 'Customer',
      isClean: true 
    });

    const orderDataset = await datasetModel.findOne({ 
      _id: orderDatasetId, 
      user: userId,
      type: 'Order',
      isClean: true 
    });

    if (!customerDataset || !orderDataset) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid datasets or datasets not cleaned yet.' 
      });
    }

    // Idempotency: If a segmentation for this user + dataset pair already exists, reuse it
    const existingDoc = await segmentationModel.findOne({
      user: userId,
      customerDatasetId,
      orderDatasetId,
    });

    if (existingDoc && existingDoc.mergedFileId) {
      console.log('[INFO] Reusing existing segmentation:', existingDoc._id);
      // Read header columns from existing merged CSV to filter available pairs from mergedFile
      try {
        const bucket = getGridFSBucket();
        const downloadStream = bucket.openDownloadStream(existingDoc.mergedFileId);
        let buffer = '';
        let headerParsed = false;
        const columns = await new Promise((resolve, reject) => {
          downloadStream.on('data', (chunk) => {
            if (headerParsed) return;
            buffer += chunk.toString('utf8');
            const newlineIdx = buffer.indexOf('\n');
            if (newlineIdx !== -1) {
              let headerLine = buffer.substring(0, newlineIdx);
              headerLine = headerLine.replace(/^\ufeff/, '').replace(/\r$/, '');
              const cols = headerLine.split(',').map((c) => c.trim());
              headerParsed = true;
              downloadStream.destroy();
              resolve(cols);
            }
          });
          downloadStream.on('error', (err) => reject(err));
          downloadStream.on('end', () => {
            if (!headerParsed) {
              let headerLine = buffer.replace(/^\ufeff/, '').replace(/\r$/, '');
              const cols = headerLine.length ? headerLine.split(',').map((c) => c.trim()) : [];
              resolve(cols);
            }
          });
        });
        const featureSet = new Set(columns.map(c => c));
        // filter out id column
        featureSet.delete('customerid');
        const availablePairs = segmentationPairs.filter(p => p.features.every(({ key }) => featureSet.has(String(key))));
        console.log('[DEBUG] Available segmentation pairs from existing merged file:', availablePairs);
        return res.json({
          success: true,
          segmentationId: existingDoc._id,
          summary: existingDoc.summary || null,
          availablePairs,
        });
      } catch (e) {
        console.warn('[INFO] Reuse segmentation but failed to read header, returning full catalogue:', e?.message);
        return res.json({
          success: true,
          segmentationId: existingDoc._id,
          summary: existingDoc.summary || null,
          availablePairs: segmentationPairs,
        });
      }
    }

    // Read customer data from GridFS
    const bucket = getGridFSBucket();
    const customerRows = await new Promise((resolve, reject) => {
      const rows = [];
      const downloadStream = bucket.openDownloadStream(customerDataset.fileId);
      
      downloadStream
        .pipe(csvParser())
        .on('data', (row) => rows.push(row))
        .on('end', () => resolve(rows))
        .on('error', reject);
    });

    // Read order data from GridFS
    const orderRows = await new Promise((resolve, reject) => {
      const rows = [];
      const downloadStream = bucket.openDownloadStream(orderDataset.fileId);
      
      downloadStream
        .pipe(csvParser())
        .on('data', (row) => rows.push(row))
        .on('end', () => resolve(rows))
        .on('error', reject);
    });

    console.log(`[LOG - STEP 0: STAGE PREPARE MERGING] - Loaded ${customerRows.length} customers and ${orderRows.length} orders`);

    // === STEP 1: AGGREGATE ORDER DATA ===
    // Group all orders by customerid and calculate behavioral metrics
    console.log('>>>>>>>>>>>>>>>>>>>>>>>>>> ENTRY: aggregateOrderData function >>>>>>>>>>>>>>>>>>>>>>>>>>');
    const aggregatedOrderData = aggregateOrderData(orderRows);
    console.log(`[LOG - STEP 1: AGGREGATE ORDER DATA] - Aggregated order data for ${Object.keys(aggregatedOrderData).length} customers`);
    console.log('>>>>>>>>>>>>>>>>>>>>>>>>>> EXIT: aggregateOrderData function >>>>>>>>>>>>>>>>>>>>>>>>>>');

    // === STEP 2: MERGE CUSTOMER AND ORDER DATA ===
    // Combine demographics (from customer CSV) with behavior (from aggregated orders)
    console.log('>>>>>>>>>>>>>>>>>>>>>>>>>> ENTRY: mergeCustomerAndOrderData function >>>>>>>>>>>>>>>>>>>>>>>>>>');
    const mergedData = mergeCustomerAndOrderData(customerRows, aggregatedOrderData);
    console.log(`[LOG - STEP 2: MERGE CUSTOMER AND ORDER DATA] - Merged data: ${mergedData.length} customer profiles created`);
    console.log('>>>>>>>>>>>>>>>>>>>>>>>>>> EXIT: mergeCustomerAndOrderData function >>>>>>>>>>>>>>>>>>>>>>>>>>');

    // === CREATE OR REUSE SEGMENTATION RECORD WITHOUT STORING JSON ===
    let segRecord = existingDoc;
    if (!segRecord) {
      try {
        segRecord = await segmentationModel.create({
          user: userId,
          customerDatasetId: customerDatasetId,
          orderDatasetId: orderDatasetId,
        });
      } catch (createErr) {
        // Handle race conditions when unique index prevents duplicates
        if (createErr && createErr.code === 11000) {
          segRecord = await segmentationModel.findOne({
            user: userId,
            customerDatasetId,
            orderDatasetId,
          });
        } else {
          throw createErr;
        }
      }
    }

    // Convert merged data to CSV and upload to GridFS for durable storage/download
    const toCsv = (rows) => {
      if (!rows || rows.length === 0) return '';
      // Build a stable column order: first row's keys in order, then any additional keys encountered
      const first = rows[0] || {};
      const firstKeys = Object.keys(first);
      const seen = new Set(firstKeys);
      const extras = [];
      for (const r of rows) {
        for (const k of Object.keys(r)) {
          if (!seen.has(k)) { seen.add(k); extras.push(k); }
        }
      }
      const columns = [...firstKeys, ...extras];

      return csvStringify(rows, {
        header: true,
        columns,
        bom: false,
        record_delimiter: '\n',
        cast: { null: () => '' }
      });
    };

    try {
      const bucket = getGridFSBucket();
      const csvString = toCsv(mergedData); 
      const uploadStream = bucket.openUploadStream(`segmentation_merged_${new Date().toISOString()}.csv`);
      const readable = Readable.from(csvString);
      await new Promise((resolve, reject) => {
        readable.pipe(uploadStream)
          .on('finish', resolve)
          .on('error', reject);
      });
      // Persist the GridFS file id on segmentation record
      segRecord.mergedFileId = uploadStream.id;
    } catch (csvErr) {
      console.warn('Failed to store merged CSV in GridFS:', csvErr?.message);
    }
    // Build recommended pairs based on available features in merged data
    const featureSet = new Set();
    for (const row of mergedData) {
      Object.keys(row || {}).forEach(k => featureSet.add(k));
    }
    const availablePairs = segmentationPairs.filter(p => p.features.every(({ key }) => featureSet.has(String(key))));
    // console.log('[DEBUG] Available segmentation pairs:', availablePairs);
    const summaryPayload = {
      totalCustomers: mergedData.length,
      totalOrders: orderRows.length,
      customersWithOrders: Object.keys(aggregatedOrderData).length,
      customersWithoutOrders: mergedData.length - Object.keys(aggregatedOrderData).length,
      // Only count as having data if key exists and value is not null
      hasAgeData: mergedData.some(c => ('age' in c) && c.age !== null),
      hasGenderData: mergedData.some(c => ('gender' in c) && c.gender !== null),
    };
    console.log('[DEBUG] Summary payload:', summaryPayload);
    segRecord.summary = summaryPayload;
    await segRecord.save();

    // === RETURN RESULTS TO FRONTEND (include segmentationId for client usage) ===
    console.log('[LOG - STEP 4: DONE MERGING] Saved segmentation record:', segRecord._id);
    console.log('>>>>>>>>>>>>>>>>>>>>>>>>>> EXIT: /prepare route, (prepareSegmentationData) >>>>>>>>>>>>>>>>>>>>>>>>>>');
    res.json({ success: true, segmentationId: segRecord._id, summary: summaryPayload, availablePairs });

  } catch (error) {
    console.error('❌ Error preparing segmentation data:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to prepare segmentation data',
      error: error.message 
    });
  }
};

//===============================================================================================
// Download merge dataset
export const downloadMergedCsv = async (req, res) => {
  console.log('>>>>>>>>>>>>>>>>>>>>>>>>>> ENTRY: downloadMergedCsv function >>>>>>>>>>>>>>>>>>>>>>>>');
  try {
    const { userId } = req;
    const { segmentationId } = req.body;
    if (!segmentationId) {
      return res.status(400).json({ success: false, message: 'segmentationId is required' });
    }

    const segRecord = await segmentationModel.findOne({ _id: segmentationId, user: userId });
    if (!segRecord) {
      return res.status(404).json({ success: false, message: 'Segmentation record not found' });
    }

    if (!segRecord.mergedFileId) {
      return res.status(404).json({ success: false, message: 'No merged CSV stored for this segmentation' });
    }

    const bucket = getGridFSBucket();
    const downloadStream = bucket.openDownloadStream(segRecord.mergedFileId);
    const filename = `merged_customer_profiles_${new Date().toISOString().slice(0,10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    downloadStream.on('error', (err) => {
      console.error('GridFS download error:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Failed to stream merged CSV' });
      }
    });

    downloadStream.pipe(res);
    console.log('>>>>>>>>>>>>>>>>>>>>>>>>>> EXIT: downloadMergedCsv function >>>>>>>>>>>>>>>>>>>>>>>>');
  } catch (err) {
    console.error('Download merged CSV failed:', err);
    res.status(500).json({ success: false, message: 'Server error downloading merged CSV' });
  }
};

//===============================================================================================
// List merged dataset columns (for custom attribute selection)
export const getMergedColumns = async (req, res) => {
  try {
    const { userId } = req;
    const { segmentationId } = req.params;

    if (!segmentationId) {
      return res.status(400).json({ success: false, message: 'segmentationId is required' });
    }

    const segRecord = await segmentationModel.findOne({ _id: segmentationId, user: userId });
    if (!segRecord) {
      return res.status(404).json({ success: false, message: 'Segmentation record not found' });
    }

    if (!segRecord.mergedFileId) {
      return res.status(404).json({ success: false, message: 'No merged CSV stored for this segmentation' });
    }

    const bucket = getGridFSBucket();
    const downloadStream = bucket.openDownloadStream(segRecord.mergedFileId);

    // Read only the first line (header) to extract columns
    let buffer = '';
    let headerParsed = false;

    downloadStream.on('data', (chunk) => {
      if (headerParsed) return; // ignore further data once header is parsed
      buffer += chunk.toString('utf8');
      const newlineIdx = buffer.indexOf('\n');
      if (newlineIdx !== -1) {
        let headerLine = buffer.substring(0, newlineIdx);
        // Handle Windows CRLF and BOM
        headerLine = headerLine.replace(/^\ufeff/, '').replace(/\r$/, '');
        let columns = headerLine.split(',').map(col => col.trim());
        columns = columns.filter(c => c.toLowerCase() !== 'customerid');
        console.log('[DEBUG] Merged columns (early, filtered):', columns);
        headerParsed = true;
        downloadStream.destroy();
        return res.json({ success: true, columns });
      }
    });

    downloadStream.on('error', (err) => {
      console.error('GridFS read error (columns):', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Failed to read merged CSV header' });
      }
    });

    downloadStream.on('end', () => {
      if (!headerParsed) {
        // If no newline found (single-line CSV), parse entire buffer
        let headerLine = buffer.replace(/^\ufeff/, '');
        headerLine = headerLine.replace(/\r$/, '');
        if (headerLine.length === 0) {
          console.log('[DEBUG] Merged columns (end): []');
          return res.json({ success: true, columns: [] });
        }
        let columns = headerLine.split(',').map(col => col.trim());
        columns = columns.filter(c => c.toLowerCase() !== 'customerid');
        console.log('[DEBUG] Merged columns (end, filtered):', columns);
        return res.json({ success: true, columns });
      }
    });
  } catch (err) {
    console.error('Get merged columns failed:', err);
    res.status(500).json({ success: false, message: 'Server error getting merged columns' });
  }
};

//===============================================================================================
//WIP - Run segmentation, Do checking on the after segmentsation done, and then check does it overwrite the dataset into DB
// Run segmentation flow
function streamMergedToTemp(mergedFileId, tempPath) {
  return new Promise(async (resolve, reject) => {
    try {
      const bucket = getGridFSBucket(); // use initialized 'datasets' bucket
      // Pre-check file existence in bucket
      const filesColl = bucket.s.db.collection(`${bucket.s.options.bucketName}.files`);
      const exists = await filesColl.findOne({ _id: mergedFileId });
      if (!exists) {
        return reject(new Error(`Merged file not found in bucket '${bucket.s.options.bucketName}' for id ${mergedFileId}`));
      }
      const readStream = bucket.openDownloadStream(mergedFileId);
      const writeStream = fs.createWriteStream(tempPath);
      readStream.pipe(writeStream);
      writeStream.on('finish', () => resolve());
      writeStream.on('error', reject);
      readStream.on('error', reject);
    } catch (e) {
      reject(e);
    }
  });
}

function runSegmentationPython(csvPath, features, debugFlag) {
  return new Promise((resolve, reject) => {
    // Resolve project root (handle if server started inside /server)
    const cwd = process.cwd();
    const candidateRoots = [cwd, path.dirname(cwd)];
    let projectRoot = candidateRoots.find(r => fs.existsSync(path.join(r, 'venv_fyp_new', 'Scripts', 'python.exe')));
    if (!projectRoot) projectRoot = cwd; // fallback

    const pyExe = path.join(projectRoot, 'venv_fyp_new', 'Scripts', 'python.exe');
    const script = path.join(projectRoot, 'server', 'python', 'segmentationPipeline', 'segmentation.py');
    if (!fs.existsSync(script)) {
      return reject(new Error('Segmentation script not found in expected location.'));
    }

    if (!fs.existsSync(pyExe)) {
      return reject(new Error(`Python interpreter not found at ${pyExe}. Activate venv or adjust path.`));
    }

    // Prepare temp JSON output file
    const outJsonPath = path.join(path.dirname(csvPath), `segmentation_result_${Date.now()}.json`);
    const args = ['--csv', csvPath, '--features', features.join(','), '--out', outJsonPath];
    if (debugFlag) 
      args.push('--verbose');
    console.log('[SEGMENTATION RUN] Using python:', pyExe);
    console.log('[SEGMENTATION RUN] Using script:', script);
    console.log('[SEGMENTATION RUN] Features:', features);
    console.log('[SEGMENTATION RUN] CSV path:', csvPath);
    console.log('[SEGMENTATION RUN] JSON out path:', outJsonPath);

    const proc = spawn(pyExe, [script, ...args], { shell: false, env: { ...process.env, PYTHONUNBUFFERED: '1' } });
    let out = '';
    let err = '';
    const stderrLines = [];
    proc.stdout.on('data', d => {
      const chunk = d.toString();
      out += chunk;
      console.log('[SEGMENTATION RUN][PY-STDOUT]', chunk.trim().slice(0, 500));
    });
    proc.stderr.on('data', d => {
      const chunk = d.toString();
      err += chunk;
      const trimmed = chunk.trim();
      console.error('[SEGMENTATION RUN][PY-STDERR]', trimmed.slice(0, 500));
      if (trimmed) stderrLines.push(trimmed);
    });
    proc.on('error', spawnErr => {
      console.error('[SEGMENTATION RUN] Spawn error:', spawnErr);
    });
    proc.on('close', code => {
      if (code !== 0) {
        console.error('[SEGMENTATION RUN] Non-zero exit code:', code);
        console.error('[SEGMENTATION RUN] Stderr snippet:', err.slice(0, 1000));
        return reject(new Error(`EXIT_CODE_${code};STDERR:${err.slice(0, 300)}`));
      }
      // Prefer reading JSON from file
      if (fs.existsSync(outJsonPath)) {
        try {
          const fileData = fs.readFileSync(outJsonPath, 'utf-8');
          const parsed = JSON.parse(fileData);
          if (debugFlag) parsed._debugLogs = stderrLines;
          // cleanup JSON file
          try { fs.unlinkSync(outJsonPath); } catch(_) {}
          return resolve(parsed);
        } catch (e) {
          console.error('[SEGMENTATION RUN] Failed reading/parsing JSON file:', e.message);
          // Fallback to stdout parse
        }
      } else {
        console.warn('[SEGMENTATION RUN] Output JSON file missing, falling back to stdout parsing');
      }
      try {
        const parsedStd = JSON.parse(out);
        if (debugFlag) parsedStd._debugLogs = stderrLines;
        resolve(parsedStd);
      } catch (e) {
        console.error('[SEGMENTATION RUN] JSON parse failure (stdout fallback). Raw stdout (truncated 1000 chars):', out.slice(0, 1000));
        return reject(new Error(`JSON_PARSE_FAIL:${e.message};RAW_OUT:${out.slice(0,300)}`));
      }
    });
  });
}

export const runSegmentationFlow = async (req, res) => {
  console.log('>>>>>>>>>>>>>>>>>>>>>>>>>> ENTRY: runSegmentationFlow function >>>>>>>>>>>>>>>>>>>>>>>>');
  try {
    const segmentationId = req.params.segmentationId;
    const { features } = req.body;
    if (!Array.isArray(features) || features.length < 3) {
      return res.status(400).json({ message: 'Please provide features: an array of three attributes.' });
    }

    const segRecord = await segmentationModel.findById(segmentationId);
    if (!segRecord || !segRecord.mergedFileId) {
      return res.status(404).json({ message: 'Segmentation or merged data not found.' });
    }

    // === CACHE: If a run with the same features already exists, return it directly ===
    const existingRun = (segRecord.runsSegmentationResult || []).find(r => {
      const saved = r.selectedPair || [];
      // Must match length
      if (saved.length !== features.length) return false;

      // Check if every element in 'features' exists in 'saved' (order does not matter)
      return features.every(f => saved.includes(f));
    });
    if (existingRun) {
      const result = existingRun;
      const responsePayload = {
        success: true,
        bestK: result.decision.selected_k,
        clusterSummary: result.cluster_summary,
        assignments: result.cluster_assignments,
        selectedFeatures: features,
      };
      console.log('[DEBUG] Use back segment result, already run before.');
      console.log('>>>>>>>>>>>>>>>>>>>>>>>>>> EXIT: runSegmentationFlow function >>>>>>>>>>>>>>>>>>>>>>>>');
      return res.json(responsePayload);
    }

    const cwd = process.cwd();
    const isServerCwd = path.basename(cwd) === 'server';
    const serverRoot = isServerCwd ? cwd : path.join(cwd, 'server');
    const tempDir = path.join(serverRoot, 'temp');
    if (!fs.existsSync(tempDir)) 
      fs.mkdirSync(tempDir, { recursive: true });
    const tempCsv = path.join(tempDir, `merged_${segmentationId}.csv`);

    try {
      await streamMergedToTemp(segRecord.mergedFileId, tempCsv);
    } catch (streamErr) {
      console.error('[SEGMENTATION RUN] Failed streaming merged file:', streamErr.message);
      return res.status(404).json({ message: 'Merged CSV file missing', error: streamErr.message, segmentationId });
    }

    const tempSize = fs.existsSync(tempCsv) ? fs.statSync(tempCsv).size : 0;
    if (tempSize === 0) {
      return res.status(500).json({ message: 'Temp CSV is empty', segmentationId });
    }

    const debugFlag = true;
    let result;
    try {
      console.log('>>>>>>>>>>>>>>>>>>>>>>>>>> ENTRY: runSegmentationPython function >>>>>>>>>>>>>>>>>>>>>>>>');
      result = await runSegmentationPython(tempCsv, features, debugFlag);
      console.log('>>>>>>>>>>>>>>>>>>>>>>>>>> EXIT: runSegmentationPython function >>>>>>>>>>>>>>>>>>>>>>>>');
      console.log('[DEBUG: result return after clustering done]:', result);
    } catch (pyErr) {
      console.error('[SEGMENTATION RUN] Python invocation failed:', pyErr.message);
      return res.status(500).json({ message: 'Segmentation run failed', error: pyErr.message, debug: true });
    }

    // Persist selection metadata for caching
    result.selectedPair = features;
    segRecord.runsSegmentationResult.push(result);
    await segRecord.save();

    // --------------------- Response ---------------------
    const responsePayload = {
      success: true,
      bestK: result.decision.selected_k,
      clusterSummary: result.cluster_summary,
      assignments: result.cluster_assignments,
      selectedFeatures: features,
    };
    console.log('>>>>>>>>>>>>>>>>>>>>>>>>>> EXIT: runSegmentationFlow function >>>>>>>>>>>>>>>>>>>>>>>>');
    return res.json(responsePayload);
  } catch (err) {
    console.error('[Segmentation run error]', err);
    return res.status(500).json({ message: 'Segmentation run failed', error: String(err) });
  }
};

//===============================================================================================
export const showSegmentationResultInDashboard = async (req, res) => {
  console.log('>>>>>>>>>>>>>>>>>>>>>>>>>> ENTRY: showSegmentationResultInDashboard function >>>>>>>>>>>>>>>>>>>>>>>>');
  try {
    const { segmentationId } = req.params;
    const { features } = req.body;

    if (!segmentationId) {
      return res.status(400).json({ success: false, message: 'segmentationId is required' });
    }
    if (!Array.isArray(features) || features.length === 0) {
      return res.status(400).json({ success: false, message: 'features (selectedPair) is required as a non-empty array' });
    }

    const { userId } = req;
    const seg = userId
      ? await segmentationModel.findOne({ _id: segmentationId, user: userId })
      : await segmentationModel.findById(segmentationId);

    if (!seg) return res.status(404).json({ success: false, message: 'Segmentation record not found' });
    if (!seg.mergedFileId) return res.status(404).json({ success: false, message: 'Merged dataset not found' });

    const reqSet = new Set(features.map(String));
    const run = (seg.runsSegmentationResult || []).find(r => {
      const saved = (r.selectedPair || []).map(String);
      return saved.length === reqSet.size && saved.every(f => reqSet.has(f));
    });
    if (!run) return res.status(404).json({ success: false, message: 'No segmentation result found for the selected features. Please run segmentation first.' });

    // Map customer -> cluster (robust to casing)
    const assignmentMap = new Map();
    for (const rec of run.cluster_assignments || []) {
      const cid = rec?.CustomerId;
      const clusterVal = rec?.Cluster;
      if (cid != null && clusterVal != null) {
        assignmentMap.set(String(cid), Number(clusterVal));
      }
    }

    const summaries = {};
    let totalCustomers = 0;
    let totalRevenue = 0;
    let includeGender = false;
    let includeAgeGroup = false;

    const bucket = getGridFSBucket();
    await new Promise((resolve, reject) => {
      const parser = csvParser();
      parser.on('headers', (headers) => {
        includeGender = headers.includes('Gender');
        includeAgeGroup = headers.includes('AgeGroup');
      });

      bucket.openDownloadStream(seg.mergedFileId)
        .pipe(parser)
        .on('data', (row) => {
          const cidStr = row?.CustomerId != null ? String(row.CustomerId) : null;
          const cluster = cidStr ? (assignmentMap.get(cidStr) ?? null) : null;
          const key = cluster != null ? cluster : 'Unassigned';

          // For cluster info
          if (!summaries[key]) {
            summaries[key] = {
              size: 0,  // cluster size - how many customers
              orders: 0, // how many orders in total
              spend: 0, // total revenue (Monetary)
              aov: 0, // average order value
              recency: 0, // recency in days
              frequency: 0, // Measures how much they purchase per month
              lifetime: 0, //  how long the customer has been active: months between first and last purchase.
              gender: {}, 
              ageGroup: {},
              state: {}, 
              city: {}, 
              dayPart: {}, 
              purchaseHour: {}, 
              item: {}, 
              stateSpend: {}
            };
          }

          const s = summaries[key];
          totalCustomers += 1;
          s.size += 1;
          s.orders += parseFloat(row.TotalOrders || 0);
          const spend = parseFloat(row.Monetary || 0);
          s.spend += spend;
          totalRevenue += spend;
          s.aov += parseFloat(row.AvgOrderValue || 0);
          s.recency += parseFloat(row.Recency || 0);
          s.lifetime += parseFloat(row.CustomerLifetimeMonths || 0);
          s.frequency += parseFloat(row.Frequency || 0);
          const gender = row.Gender;
          const ageGroup = row.AgeGroup;
          const state = row.State;
          const city = row.City;
          const dayPart = row.FavoriteDayPart;
          const purchaseHour = row.FavoritePurchaseHour;
          const favoriteItem = row.FavoriteItem;

          if (gender) s.gender[gender] = (s.gender[gender] || 0) + 1;
          if (ageGroup) s.ageGroup[ageGroup] = (s.ageGroup[ageGroup] || 0) + 1;
          if (state) {
            s.state[state] = (s.state[state] || 0) + 1;
            s.stateSpend[state] = (s.stateSpend[state] || 0) + spend;
          }
          if (city) s.city[city] = (s.city[city] || 0) + 1;
          if (dayPart) s.dayPart[dayPart] = (s.dayPart[dayPart] || 0) + 1;
          if (purchaseHour) s.purchaseHour[purchaseHour] = (s.purchaseHour[purchaseHour] || 0) + 1;
          if (favoriteItem) s.item[favoriteItem] = (s.item[favoriteItem] || 0) + 1;
        })
        .on('end', resolve)
        .on('error', reject);
    });

    const getTop = (obj, clusterSize) => {
      if (!obj || Object.keys(obj).length === 0) return { top: 'N/A', pct: 0 };
      const entries = Object.entries(obj).sort((a, b) => b[1] - a[1]);
      const pct = Number(((entries[0][1] / clusterSize) * 100).toFixed(1));
      return { top: entries[0][0], pct };
    };

    const formatHour = (hourStr) => {
      if (!hourStr || hourStr === 'N/A') return 'N/A';
      const hour = parseInt(hourStr, 10);
      if (isNaN(hour)) return hourStr;
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour} ${period}`;
    };

    // Default to RFM-only segmentation for dashboard logic
    const activePair = 'rfm';

    // Enrich clusters
    const enrichedSummaries = Object.keys(summaries).map(key => {
      const data = summaries[key];
      const isUnassigned = key === 'Unassigned';
      const clusterId = isUnassigned ? -1 : Number(key);

      const genderTop = getTop(data.gender, data.size);
      const ageTop = getTop(data.ageGroup, data.size);
      const stateTop = getTop(data.state, data.size);
      const cityTop = getTop(data.city, data.size);
      const dayPartTop = getTop(data.dayPart, data.size);
      const purchaseHourTop = getTop(data.purchaseHour, data.size);
      const favoriteItemTop = getTop(data.item, data.size);

      const segment = {
        cluster: clusterId,
        size: data.size,
        sizePct: totalCustomers ? Number((data.size / totalCustomers * 100).toFixed(2)) : 0,
        revenue: Number(data.spend.toFixed(2)),
        revenuePct: totalRevenue ? Number((data.spend / totalRevenue * 100).toFixed(2)) : 0,
        avgAOV: Number((data.aov / data.size).toFixed(2)),
        avgLifetimeMonths: Number((data.lifetime / data.size).toFixed(0)),
        avgRecencyDays: Number((data.recency / data.size).toFixed(0)),
        avgFrequencyPerMonth: Number((data.frequency / data.size).toFixed(0)),
        avgSpend: Number((data.spend / data.size).toFixed(2)),
        states: Object.entries(data.state || {}).map(([name, count]) => ({
          name, count,
          pct: Number((count / data.size * 100).toFixed(1)),
          revenue: Number((data.stateSpend?.[name] || 0).toFixed(2))
        })).sort((a, b) => b.revenue - a.revenue),

        items: Object.entries(data.item || {}).map(([name, count]) => ({
          name, count, pct: Number((count / data.size * 100).toFixed(1))
        })).sort((a, b) => b.count - a.count).slice(0, 5),

        cities: Object.entries(data.city || {}).map(([name, count]) => ({
          name, count, pct: Number((count / data.size * 100).toFixed(1))
        })).sort((a, b) => b.count - a.count).slice(0, 10),

        topState: stateTop.top,
        statePct: stateTop.pct,
        topCity: cityTop.top,

        topDayPart: dayPartTop.top,
        topPurchaseHour: purchaseHourTop.top !== 'N/A' ? formatHour(purchaseHourTop.top) : 'N/A',
        purchaseHourPct: purchaseHourTop.pct,
        topFavoriteItem: favoriteItemTop.top,
        favoriteItemPct: favoriteItemTop.pct
      };

      if (includeGender) {
        segment.topGender = genderTop.top;
        segment.genderPct = genderTop.pct;
      }
      if (includeAgeGroup) {
        segment.topAgeGroup = ageTop.top;
        segment.agePct = ageTop.pct;
      }

      return segment;
    });

    // ---------------- Strict RFM Naming (no fallback) ----------------
    const assignRFMNameStrict = (cluster, allClusters) => {
      // Percentile helpers
      const percentileRank = (value, allValues) => {
        const arr = [...allValues].filter(v => typeof v === 'number' && !isNaN(v));
        if (!arr.length) return 0.5;
        arr.sort((a, b) => a - b);
        const idx = arr.findIndex(v => v >= value);
        const pos = idx === -1 ? arr.length - 1 : idx;
        return (pos) / (arr.length - 1 || 1);
      };

      // Normalize cluster to 0-1 R, F, M
      const allSpend = allClusters.map(c => c.avgSpend);
      const allFreq = allClusters.map(c => c.avgFrequencyPerMonth);
      const allRec = allClusters.map(c => c.avgRecencyDays);
      const r = 1 - percentileRank(cluster.avgRecencyDays, allRec); // more recent → higher R
      const f = percentileRank(cluster.avgFrequencyPerMonth, allFreq);
      const m = percentileRank(cluster.avgSpend, allSpend);

      // Define archetype prototypes in R,F,M space
      const prototypes = [
        { name: 'Champions',            r: 1.00, f: 1.00, m: 1.00 },
        { name: 'Loyal Customers',      r: 0.85, f: 0.85, m: 0.65 },
        { name: 'Potential Loyalists',  r: 0.85, f: 0.60, m: 0.60 },
        { name: 'New Customers',        r: 0.95, f: 0.20, m: 0.20 },
        { name: "Can't Lose Them",     r: 0.50, f: 0.90, m: 0.90 },
        { name: 'At Risk',              r: 0.20, f: 0.90, m: 0.90 },
        { name: 'Regular Customers',    r: 0.50, f: 0.50, m: 0.50 },
        { name: 'Need Attention',       r: 0.50, f: 0.30, m: 0.60 },
        { name: 'About to Sleep',       r: 0.30, f: 0.50, m: 0.50 },
        { name: 'Hibernating',          r: 0.20, f: 0.20, m: 0.50 },
        { name: 'Lost',                 r: 0.10, f: 0.10, m: 0.10 },
      ];

      // Weighted Euclidean distance (bias towards Recency if desired)
      const wR = 0.4, wF = 0.3, wM = 0.3;
      let best = prototypes[0];
      let bestDist = Infinity;
      for (const p of prototypes) {
        const dr = r - p.r;
        const df = f - p.f;
        const dm = m - p.m;
        const dist = Math.sqrt(wR*dr*dr + wF*df*df + wM*dm*dm);
        if (dist < bestDist) {
          bestDist = dist;
          best = p;
        }
      }
      return best.name;
    };

    const usableClusters = enrichedSummaries.filter(s => s.cluster !== -1);
    enrichedSummaries
      .filter(s => s.cluster !== -1)
      .forEach((s) => {
        s.suggestedName = assignRFMNameStrict(s, usableClusters);
      });

    res.json({
      success: true,
      data: {
        totalCustomers,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        averageSpendOverall: totalCustomers ? Number((totalRevenue / totalCustomers).toFixed(2)) : 0,
        summaries: enrichedSummaries.filter(s => s.cluster !== -1)
      }
    });

    console.log('>>>>>>>>>>>>>>>>>>>>>>>>>> ENTRY: showSegmentationResultInDashboard function >>>>>>>>>>>>>>>>>>>>>>>>');
  } catch (err) {
    console.error('[showSegmentationResultInDashboard] Error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate dashboard data', error: err.message });
  }
};
