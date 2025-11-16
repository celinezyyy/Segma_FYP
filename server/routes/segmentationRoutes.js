import express from 'express';
import { prepareSegmentationData, downloadMergedCsv } from '../controllers/segmentationController.js';
import userAuth from '../middleware/userAuth.js';

const segmentationRouter = express.Router();

// Merge customer and order data for segmentation
segmentationRouter.post('/prepare', userAuth, prepareSegmentationData);
segmentationRouter.post('/download', userAuth, downloadMergedCsv);

export default segmentationRouter;
