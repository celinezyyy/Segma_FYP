import express from 'express';
import { prepareSegmentationData, downloadMergedCsv, runSimpleSegmentation } from '../controllers/segmentationController.js';
import userAuth from '../middleware/userAuth.js';

const segmentationRouter = express.Router();

// Merge customer and order data for segmentation
segmentationRouter.post('/prepare', userAuth, prepareSegmentationData);
segmentationRouter.post('/download', userAuth, downloadMergedCsv);
segmentationRouter.post('/attributes-pairs', userAuth, downloadMergedCsv); // placeholder, may be replaced

// Run simple 2-feature segmentation
segmentationRouter.post('/run', userAuth, runSimpleSegmentation);

export default segmentationRouter;
