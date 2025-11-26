import express from 'express';
import { prepareSegmentationData, downloadMergedCsv } from '../controllers/segmentationController.js';
import userAuth from '../middleware/userAuth.js';

const segmentationRouter = express.Router();

segmentationRouter.post('/prepare', userAuth, prepareSegmentationData); // merge dataset & persist segmentation
segmentationRouter.post('/download', userAuth, downloadMergedCsv); // download from persisted segmentation by id
// segmentationRouter.post('/run', userAuth, runSimpleSegmentation);

export default segmentationRouter;
