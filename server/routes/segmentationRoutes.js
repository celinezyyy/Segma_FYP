import express from 'express';
import { prepareSegmentationData, downloadMergedCsv, getMergedColumns } from '../controllers/segmentationController.js';
import userAuth from '../middleware/userAuth.js';

const segmentationRouter = express.Router();

segmentationRouter.post('/prepare', userAuth, prepareSegmentationData); // merge dataset & persist segmentation
segmentationRouter.post('/download', userAuth, downloadMergedCsv); // download from persisted segmentation by id
segmentationRouter.get('/:segmentationId/columns', userAuth, getMergedColumns); // list merged CSV columns for UI selection
// segmentationRouter.post('/run', userAuth, runSimpleSegmentation);

export default segmentationRouter;
