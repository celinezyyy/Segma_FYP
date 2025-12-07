import express from 'express';
import { prepareSegmentationData, downloadMergedCsv, runSegmentationFlow, getMergedColumns, showSegmentationResultInDashboard } from '../controllers/segmentationController.js';
import userAuth from '../middleware/userAuth.js';

const segmentationRouter = express.Router();

segmentationRouter.post('/prepare', userAuth, prepareSegmentationData); // merge dataset & persist segmentation
segmentationRouter.post('/download', userAuth, downloadMergedCsv); // download from persisted segmentation by id
segmentationRouter.post('/:segmentationId/run', userAuth, runSegmentationFlow); // param style route
segmentationRouter.get('/:segmentationId/columns', userAuth, getMergedColumns); // list merged CSV columns for UI selection
segmentationRouter.post('/:segmentationId/dashboard', userAuth, showSegmentationResultInDashboard); // list merged CSV columns for UI selection

export default segmentationRouter;
