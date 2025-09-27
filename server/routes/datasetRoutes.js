import express from 'express';
import {
  uploadDataset,
  getUserDatasets,
  deleteDataset,
  previewDataset, 
  getDatasetCounts,
  getDatasetTemplate
} from '../controllers/datasetController.js';
import userAuth from '../middleware/userAuth.js';
import datasetUpload from '../middleware/multerMiddleware.js';

const datasetRouter = express.Router();
datasetRouter.post('/upload/:type', userAuth, datasetUpload.single('file'), uploadDataset);
datasetRouter.get('/', userAuth, getUserDatasets);
datasetRouter.get('/preview/:id', userAuth, previewDataset);
datasetRouter.delete('/delete-dataset/:id', userAuth, deleteDataset);
datasetRouter.get('/dataset-counts', userAuth, getDatasetCounts);
datasetRouter.get('/template/:type', userAuth, getDatasetTemplate);

export default datasetRouter;