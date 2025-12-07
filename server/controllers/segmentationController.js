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
    // Get customer ID (lowercase because of cleaning pipeline normalization)
    const customerId = row['customerid'];
    
    // If this is the first order for this customer, initialize their data
    if (!customerOrders[customerId]) {
      customerOrders[customerId] = {
        orders: [],              // Store all raw orders
        totalSpend: 0,           // Sum of all 'total spend'
        totalOrders: 0,          // Count of orders
        purchaseDates: [],       // Array of purchase dates for recency calculation
        items: [],               // Array of items purchased
        paymentMethods: [],      // Array of payment methods used
      };
    }

    // Extract values from the row (all lowercase column names from cleaning)
    const spend = parseFloat(row['total spend']) || 0;  // Convert to number, default to 0
    const quantity = parseInt(row['purchase quantity']) || 0;
    const purchaseDate = row['purchase date'];  // Format: YYYY-MM-DD from cleaning
    const item = row['purchase item'];
    const paymentMethod = row['transaction method'];
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
    
    // Collect payment methods (to find favorite payment method later)
    if (paymentMethod) {
      customerOrders[customerId].paymentMethods.push(paymentMethod);
    }

    // Collect purchase time if available (e.g., "14:35:00")
    if (purchaseTime) {
      if (!customerOrders[customerId].purchaseTimes) customerOrders[customerId].purchaseTimes = [];
      customerOrders[customerId].purchaseTimes.push(purchaseTime);
    }
  });

  // Now calculate derived metrics (RFM, averages, etc.) for each customer
  const aggregatedData = {};
  
  Object.keys(customerOrders).forEach(customerId => {
    const data = customerOrders[customerId];
    
    // Sort dates: most recent first (newest to oldest)
    const dates = data.purchaseDates.sort((a, b) => b - a);
    
    // === CALCULATE RECENCY (R in RFM) ===
    // How many days since their last purchase?
    let daysSinceLastPurchase = null;
    let lastPurchaseDate = null;
    let firstPurchaseDate = null;
    
    if (dates.length > 0) {
      lastPurchaseDate = dates[0];  // Most recent date (first in sorted array)
      firstPurchaseDate = dates[dates.length - 1];  // Oldest date (last in array)
      const now = new Date();
      // Calculate difference in days
      daysSinceLastPurchase = Math.floor((now - lastPurchaseDate) / (1000 * 60 * 60 * 24));
    }

    // === CALCULATE AVERAGE ORDER VALUE ===
    // Total spend divided by number of orders
    const avgOrderValue = data.totalOrders > 0 ? data.totalSpend / data.totalOrders : 0;

    // === CALCULATE CUSTOMER LIFETIME (in months) ===
    // Time between first and last purchase
    let customerLifetimeMonths = null;
    if (firstPurchaseDate && lastPurchaseDate) {
      const diffTime = Math.abs(lastPurchaseDate - firstPurchaseDate);
      // Convert milliseconds to months (approx 30 days per month)
      customerLifetimeMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30));
    }

    // === CALCULATE PURCHASE FREQUENCY ===
    // How many orders per month on average?
    let purchaseFrequency = null;
    if (customerLifetimeMonths !== null && customerLifetimeMonths > 0) {
      purchaseFrequency = data.totalOrders / customerLifetimeMonths;
    } else if (data.totalOrders > 0) {
      purchaseFrequency = data.totalOrders; // Customer less than a month old
    }

    // === FIND FAVORITE PAYMENT METHOD ===
    // Count how many times each payment method was used
    const paymentMethodCounts = {};
    data.paymentMethods.forEach(method => {
      paymentMethodCounts[method] = (paymentMethodCounts[method] || 0) + 1;
    });
    // Find the method with highest count
    const favoritePaymentMethod = Object.keys(paymentMethodCounts).length > 0
      ? Object.keys(paymentMethodCounts).reduce((a, b) => 
          paymentMethodCounts[a] > paymentMethodCounts[b] ? a : b
        )
      : null;

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
    if (data.purchaseTimes && data.purchaseTimes.length > 0) {
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
      totalSpend: parseFloat(data.totalSpend.toFixed(2)),  // Round to 2 decimals
      avgOrderValue: parseFloat(avgOrderValue.toFixed(2)),
      lastPurchaseDate: lastPurchaseDate ? lastPurchaseDate.toISOString().split('T')[0] : null,  // Format: YYYY-MM-DD
      firstPurchaseDate: firstPurchaseDate ? firstPurchaseDate.toISOString().split('T')[0] : null,
      daysSinceLastPurchase: daysSinceLastPurchase,
      customerLifetimeMonths: customerLifetimeMonths || 0,
      purchaseFrequency: purchaseFrequency ? parseFloat(purchaseFrequency.toFixed(2)) : 0,
      favoritePaymentMethod: favoritePaymentMethod,
      favoriteItem: favoriteItem,
      favoritePurchaseHour: favoritePurchaseHour,   // Optional, integer 0-23
      favoriteDayPart: favoriteDayPart,             // Optional, one of Night/Morning/Afternoon/Evening
      
      // === RFM COMPONENTS (for RFM segmentation) ===
      recency: daysSinceLastPurchase,      // R: Days since last purchase (lower is better)
      frequency: data.totalOrders,         // F: Number of orders (higher is better)
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
  const hasAgeGroupColumn = ('age_group' in sampleCustomer) || ('age-group' in sampleCustomer);
  const hasGenderColumn = 'gender' in sampleCustomer;

  console.log('[LOG - MERGE] Column availability check:');
  console.log(`  - age: ${hasAgeColumn}`);
  console.log(`  - age_group: ${hasAgeGroupColumn}`);
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
      customerid: customerId,
      
      // === GEOGRAPHIC DATA (always present) ===
      city: customer['city'] || null,
      state: customer['state'] || null,
      
      // === BEHAVIORAL DATA FROM ORDERS ===
      totalOrders: orderData.totalOrders || 0,
      totalSpend: orderData.totalSpend || 0,
      avgOrderValue: orderData.avgOrderValue || 0,
      lastPurchaseDate: orderData.lastPurchaseDate || null,
      firstPurchaseDate: orderData.firstPurchaseDate || null,
      daysSinceLastPurchase: orderData.daysSinceLastPurchase || null,
      customerLifetimeMonths: orderData.customerLifetimeMonths || 0,
      purchaseFrequency: orderData.purchaseFrequency || 0,
      favoritePaymentMethod: orderData.favoritePaymentMethod || null,
      favoriteItem: orderData.favoriteItem || null,
      favoritePurchaseHour: orderData.favoritePurchaseHour ?? null,
      favoriteDayPart: orderData.favoriteDayPart ?? null,
      
      // === RFM SCORES (for RFM segmentation) ===
      recency: orderData.recency || null,
      frequency: orderData.frequency || 0,
      monetary: orderData.monetary || 0,
    };

    if (hasAgeGroupColumn) {
      // Prefer underscore if present, else fallback to hyphen variant
      const ageGroupValue = (customer['age_group'] ?? customer['age-group']);
      if (ageGroupValue && ageGroupValue !== 'Unknown') {
        mergedCustomer.ageGroup = ageGroupValue;
      } else {
        mergedCustomer.ageGroup = null; // mark as truly missing
      }
    }

    if (hasGenderColumn) {
      const genderValue = customer['gender'];
      if (genderValue && genderValue !== 'Unknown') {
        mergedCustomer.gender = genderValue;
      } else {
        mergedCustomer.gender = null; // mark as missing for accurate summary
      }
    }

    mergedData.push(mergedCustomer);
  });

  return mergedData;
};

export const prepareSegmentationData = async (req, res) => {
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
        // features in segmentationPairs are objects { key, label, unit }
        // Filter by presence of the feature key in the merged dataset columns
        // Columns were lowercased into featureSet; compare keys case-insensitively
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
    const aggregatedOrderData = aggregateOrderData(orderRows);
    console.log(`[LOG - STEP 1: AGGREGATE ORDER DATA] - Aggregated order data for ${Object.keys(aggregatedOrderData).length} customers`);

    // === STEP 2: MERGE CUSTOMER AND ORDER DATA ===
    // Combine demographics (from customer CSV) with behavior (from aggregated orders)
    const mergedData = mergeCustomerAndOrderData(customerRows, aggregatedOrderData);
    console.log(`[LOG - STEP 2: MERGE CUSTOMER AND ORDER DATA] - Merged data: ${mergedData.length} customer profiles created`);

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
//WIP
    // Persist availablePairs and summary snapshot on the record for quick reads
    // Build recommended pairs based on available features in merged data
    const featureSet = new Set();
    for (const row of mergedData) {
      Object.keys(row || {}).forEach(k => featureSet.add(k));
    }
    const availablePairs = segmentationPairs.filter(p => p.features.every(f => featureSet.has(f)));
    console.log('[DEBUG] Available segmentation pairs:', availablePairs);
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
  try {
    const segmentationId = req.params.segmentationId;
    const { features } = req.body;
    if (!Array.isArray(features) || features.length < 2) {
      return res.status(400).json({ message: 'Please provide features: an array of two attributes.' });
    }

    const segRecord = await segmentationModel.findById(segmentationId);
    if (!segRecord || !segRecord.mergedFileId) {
      return res.status(404).json({ message: 'Segmentation or merged data not found.' });
    }

    // === CACHE: If a run with the same features already exists, return it directly ===
    const existingRun = (segRecord.runsSegmentationResult || []).find(r => {
      const saved = r.selectedPair?.features || [];
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
      result = await runSegmentationPython(tempCsv, features, debugFlag);
      console.log('[DEBUG]========================', result);
    } catch (pyErr) {
      console.error('[SEGMENTATION RUN] Python invocation failed:', pyErr.message);
      return res.status(500).json({ message: 'Segmentation run failed', error: pyErr.message, debug: true });
    }

    // Persist selection metadata for caching
    result.selectedPair = { features: features }; 
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

    return res.json(responsePayload);
  } catch (err) {
    console.error('[Segmentation run error]', err);
    return res.status(500).json({ message: 'Segmentation run failed', error: String(err) });
  }
};

//===============================================================================================
export const showSegmentationResultInDashboard = async (req, res) => {
  try {
    const { segmentationId } = req.params;
    const seg = await segmentationModel.findById(segmentationId);
    if (!seg) 
      return res.status(404).json({ success: false, message: 'SegmentationID not found' });

    // Fetch merged dataset from GridFS
    const bucket = getGridFSBucket();
    const mergedData = [];
    await new Promise((resolve, reject) => {
      bucket.openDownloadStream(seg.mergedFileId)
        .pipe(csvParser())
        .on('data', (row) => mergedData.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

    // Get latest cluster assignments
    const latestRun = seg.runsSegmentationResult[seg.runsSegmentationResult.length - 1];
    const clusterAssignments = latestRun?.cluster_assignments || {};

    // Combine merged dataset with cluster
    const mergedWithClusters = mergedData.map(c => ({
      ...c,
      cluster: clusterAssignments[c.customerid] ?? 'Unassigned'
    }));

    // 4️⃣ Summarize clusters
    const clusterSummaries = {};
    mergedWithClusters.forEach(c => {
      const cid = c.cluster;
      if (!clusterSummaries[cid]) clusterSummaries[cid] = { total: 0, totalSpending: 0, totalAge: 0, genderCount: {}, cityCount: {} };

      clusterSummaries[cid].total += 1;
      clusterSummaries[cid].totalSpending += parseFloat(c.totalSpending || 0);
      clusterSummaries[cid].totalAge += parseFloat(c.age || 0);

      if (c.gender) clusterSummaries[cid].genderCount[c.gender] = (clusterSummaries[cid].genderCount[c.gender] || 0) + 1;
      if (c.city) clusterSummaries[cid].cityCount[c.city] = (clusterSummaries[cid].cityCount[c.city] || 0) + 1;
    });

    // Convert counts to human-readable summaries
    for (const cid in clusterSummaries) {
      const data = clusterSummaries[cid];
      data.avgSpending = (data.totalSpending / data.total).toFixed(2);
      data.avgAge = (data.totalAge / data.total).toFixed(1);
      data.topGender = Object.entries(data.genderCount).sort((a,b)=>b[1]-a[1])[0]?.[0] || null;
      data.topCity = Object.entries(data.cityCount).sort((a,b)=>b[1]-a[1])[0]?.[0] || null;

      // Remove raw totals to reduce payload
      delete data.totalSpending;
      delete data.totalAge;
      delete data.genderCount;
      delete data.cityCount;
    }

    res.json({
      success: true,
      mergedWithClusters,
      clusterSummaries
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};
