import datasetModel from '../models/datasetModel.js';
import { getGridFSBucket } from '../utils/gridfs.js';
import csvParser from 'csv-parser';
import { Readable } from 'stream';
import { segmentationPairs } from "../utils/segmentationPairs.js";

/**
 * Step 1: Aggregate order data by CustomerID
 * 
 * EXPLANATION:
 * - This function takes all order rows for ALL customers
 * - Groups them by customerid (e.g., all orders for "C001" together)
 * - Calculates behavioral metrics like total spend, recency, frequency
 * 
 * INPUT: Array of order rows from cleaned CSV
 * OUTPUT: Object with customerid as key, aggregated metrics as value
 * 
 * NOTE: After cleaning pipeline, all column names are LOWERCASE
 */
const aggregateOrderData = (orderRows) => {
  // Object to store aggregated data per customer
  // Structure: { "C001": { orders: [...], totalSpend: 1500, ... }, "C002": { ... } }
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

/**
 * Step 2: Merge customer demographic data with aggregated order data
 * 
 * EXPLANATION:
 * - Takes each customer row (demographics from customer dataset)
 * - Finds their aggregated order data (behavioral metrics)
 * - Combines both into one complete customer profile
 * - ONLY includes demographic columns (age, age_group, gender) if they exist in the cleaned customer dataset
 * 
 * INPUT: 
 *   - customerRows: Array of customer rows from cleaned CSV
 *   - aggregatedOrderData: Object with customerid as key, metrics as value
 * 
 * OUTPUT: Array of merged customer profiles with both demographics and behavior
 * 
 * NOTE: 
 * - Column names are LOWERCASE after cleaning pipeline
 * - Cleaning may drop optional columns (age, age_group, gender) if not provided or mostly empty
 * - We check if columns exist before merging them
 */
const mergeCustomerAndOrderData = (customerRows, aggregatedOrderData) => {
  const mergedData = [];

  // === CHECK WHICH OPTIONAL COLUMNS EXIST IN CLEANED CUSTOMER DATASET ===
  // Look at the first row to see which columns are present
  const sampleCustomer = customerRows[0] || {};
  const hasAgeColumn = 'age' in sampleCustomer;
  const hasAgeGroupColumn = 'age_group' in sampleCustomer;  // cleaning uses 'age_group' with underscore
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

    // === CONDITIONALLY ADD DEMOGRAPHIC FIELDS (only if column exists in cleaned data) ===
    if (hasAgeColumn) {
      const ageValue = customer['age'];
      // Only add if not 'Unknown' string
      if (ageValue && ageValue !== 'Unknown') {
        mergedCustomer.age = parseInt(ageValue);
      }
    }

    if (hasAgeGroupColumn) {
      const ageGroupValue = customer['age_group'];  // note: underscore from cleaning
      if (ageGroupValue && ageGroupValue !== 'Unknown') {
        mergedCustomer.ageGroup = ageGroupValue;
      }
    }

    if (hasGenderColumn) {
      const genderValue = customer['gender'];
      if (genderValue && genderValue !== 'Unknown') {
        mergedCustomer.gender = genderValue;
      }
    }

    mergedData.push(mergedCustomer);
  });

  return mergedData;
};

/**
 * Step 3: Get available attributes for segmentation
 * 
 * EXPLANATION:
 * - Checks which attributes are actually available in the data
 * - Some attributes (Age, Gender) are optional - user might not have provided them
 * - Tells frontend which attributes can be used for segmentation
 * 
 * This prevents users from trying to segment by Age if no DOB was provided
 */
const getAvailableAttributes = (mergedData) => {
  if (mergedData.length === 0) {
    return { behavioral: [], demographic: [], geographic: [] };
  }

  // Check the first customer to see which optional fields exist
  const sampleRecord = mergedData[0];
  
  // Check if Age and Gender data are available
  const hasAge = sampleRecord.age !== null;
  const hasGender = sampleRecord.gender !== null;
  // Check availability of favorite metrics
  const hasFavPayment = mergedData.some(c => !!c.favoritePaymentMethod);
  const hasFavItem = mergedData.some(c => !!c.favoriteItem);
  const hasFavHour = mergedData.some(c => c.favoritePurchaseHour !== null && c.favoritePurchaseHour !== undefined);
  const hasFavDayPart = mergedData.some(c => !!c.favoriteDayPart);
  
  const attributes = {
    // === BEHAVIORAL ATTRIBUTES ===
    // These are always available (calculated from orders)
    behavioral: [
      { value: 'totalSpend', label: 'Total Spending', available: true }, // Monetary
      { value: 'totalOrders', label: 'Number of Orders', available: true }, // Frequency
      { value: 'avgOrderValue', label: 'Average Order Value', available: true },
      { value: 'daysSinceLastPurchase', label: 'Recency - Days Since Last Purchase', available: true }, // Recency
      { value: 'purchaseFrequency', label: 'Purchase Frequency', available: true },
      { value: 'customerLifetimeMonths', label: 'Customer Lifetime (Months)', available: true },
      // Favorites and time preferences (categorical/numeric)
      { value: 'favoritePaymentMethod', label: 'Favorite Payment Method', available: hasFavPayment },
      { value: 'favoriteItem', label: 'Favorite Item', available: hasFavItem },
      { value: 'favoritePurchaseHour', label: 'Favorite Purchase Hour', available: hasFavHour },
      { value: 'favoriteDayPart', label: 'Favorite Day Part', available: hasFavDayPart },
    ],
    
    // === DEMOGRAPHIC ATTRIBUTES ===
    // These might not be available if user didn't provide DOB/Gender
    demographic: [
      { value: 'ageGroup', label: 'Age Group', available: hasAge },
      { value: 'gender', label: 'Gender', available: hasGender },
    ],
    
    // === GEOGRAPHIC ATTRIBUTES ===
    // These are always available (mandatory in customer dataset)
    geographic: [
      { value: 'state', label: 'State', available: true },
      { value: 'city', label: 'City', available: true },
    ]
  };

  return attributes;
};

/**
 * Helper: Convert merged data array to CSV string
 */
const toCsv = (rows) => {
  if (!rows || rows.length === 0) return '';
  // Determine all columns (union of keys) in a stable order
  const colsSet = new Set();
  rows.forEach(r => Object.keys(r).forEach(k => colsSet.add(k)));
  const cols = Array.from(colsSet);
  const escape = (val) => {
    if (val === null || val === undefined) return '';
    const s = String(val);
    if (s.includes('"') || s.includes(',') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const header = cols.join(',');
  const lines = rows.map(r => cols.map(c => escape(r[c])).join(','));
  return [header, ...lines].join('\n');
};

/**
 * POST /api/segmentation/download
 * Rebuild merged profiles and stream as CSV download without persisting.
 */
export const downloadMergedCsv = async (req, res) => {
  try {
    const { userId } = req;
    const { customerDatasetId, orderDatasetId } = req.body;
    console.log('[LOG - DOWNLOAD CSV] user:', userId, 'customerDatasetId:', customerDatasetId, 'orderDatasetId:', orderDatasetId);

    const customerDataset = await datasetModel.findOne({ 
      _id: customerDatasetId, user: userId, type: 'Customer', isClean: true 
    });
    const orderDataset = await datasetModel.findOne({ 
      _id: orderDatasetId, user: userId, type: 'Order', isClean: true 
    });
    if (!customerDataset || !orderDataset) {
      return res.status(400).json({ success: false, message: 'Invalid datasets or not cleaned.' });
    }

    const bucket = getGridFSBucket();
    const readCsv = (fileId) => new Promise((resolve, reject) => {
      const rows = [];
      bucket.openDownloadStream(fileId)
        .pipe(csvParser())
        .on('data', (row) => rows.push(row))
        .on('end', () => resolve(rows))
        .on('error', reject);
    });

    const [customerRows, orderRows] = await Promise.all([
      readCsv(customerDataset.fileId),
      readCsv(orderDataset.fileId)
    ]);

    const aggregatedOrderData = aggregateOrderData(orderRows);
    const mergedData = mergeCustomerAndOrderData(customerRows, aggregatedOrderData);

  const csv = '\ufeff' + toCsv(mergedData); // Prepend BOM for Excel compatibility
  const filename = `merged_customer_profiles_${new Date().toISOString().slice(0,10)}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csv);
  } catch (err) {
    console.error('❌ Failed to build merged CSV:', err);
    res.status(500).json({ success: false, message: 'Failed to generate merged CSV', error: err.message });
  }
};

/**
 * Main controller: Merge and prepare data for segmentation
 * 
 * EXPLANATION OF THE COMPLETE FLOW:
 * 
 * 1. Validate that both datasets exist and are cleaned
 * 2. Read customer data from GridFS (MongoDB file storage)
 * 3. Read order data from GridFS
 * 4. Aggregate order data by customerid (Step 1)
 * 5. Merge customer demographics with order behavior (Step 2)
 * 6. Detect which attributes are available (Step 3)
 * 7. Return merged data + metadata to frontend
 * 
 * ENDPOINT: POST /api/segmentation/prepare
 * REQUIRES: Authentication (userAuth middleware)
 * BODY: { customerDatasetId, orderDatasetId }
 */
export const prepareSegmentationData = async (req, res) => {
  try {
    const { userId } = req;
    const { customerDatasetId, orderDatasetId } = req.body;

    console.log('[LOG - STAGE MERGING] Preparing segmentation data...');
    console.log('[LOG - STAGE MERGING] User ID:', userId);
    console.log('[LOG - STAGE MERGING] Customer Dataset ID:', customerDatasetId);
    console.log('[LOG - STAGE MERGING] Order Dataset ID:', orderDatasetId);

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

    console.log(`[LOG - STAGE PREPARE MERGING] - Loaded ${customerRows.length} customers and ${orderRows.length} orders`);

    // === STEP 1: AGGREGATE ORDER DATA ===
    // Group all orders by customerid and calculate behavioral metrics
    const aggregatedOrderData = aggregateOrderData(orderRows);
    console.log(`[LOG - STAGE PREPARE MERGING] - Aggregated order data for ${Object.keys(aggregatedOrderData).length} customers`);

    // === STEP 2: MERGE CUSTOMER AND ORDER DATA ===
    // Combine demographics (from customer CSV) with behavior (from aggregated orders)
    const mergedData = mergeCustomerAndOrderData(customerRows, aggregatedOrderData);
    console.log(`[LOG - STAGE PREPARE MERGING] - Merged data: ${mergedData.length} customer profiles created`);

    // === STEP 3: DETECT AVAILABLE ATTRIBUTES ===
    // Check which attributes exist (some are optional like Age, Gender)
    const availableAttributes = getAvailableAttributes(mergedData);
    console.log(`[LOG - STAGE PREPARE MERGING] - Available attributes:`, availableAttributes);

    // === RETURN RESULTS TO FRONTEND ===
    res.json({
      success: true,
      data: {
        // Complete customer profiles (demographics + behavior)
        customerProfiles: mergedData,
        
        // Which attributes are available for segmentation
        availableAttributes: availableAttributes,
        
        // Summary statistics for display
        summary: {
          totalCustomers: mergedData.length,
          totalOrders: orderRows.length,
          customersWithOrders: Object.keys(aggregatedOrderData).length,
          customersWithoutOrders: mergedData.length - Object.keys(aggregatedOrderData).length,
          hasAgeData: mergedData.some(c => c.age !== null),  // lowercase
          hasGenderData: mergedData.some(c => c.gender !== null),  // lowercase
        }
      }
    });

  } catch (error) {
    console.error('❌ Error preparing segmentation data:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to prepare segmentation data',
      error: error.message 
    });
  }
};

// Endpoint to get predefined segmentation pairs
export const getSegmentationPairs = (req, res) => {
  return res.json({
    success: true,
    pairs: segmentationPairs
  });
};