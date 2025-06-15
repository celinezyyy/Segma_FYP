import express from 'express';
import {
  uploadDataset,
  getUserDatasets,
  deleteDataset,
  previewDataset
} from '../controllers/datasetController.js';
import userAuth from '../middleware/userAuth.js';
import datasetUpload from '../middleware/multerMiddleware.js';

const datasetRouter = express.Router();
datasetRouter.post('/upload/:type', userAuth, datasetUpload.single('file'), uploadDataset);
datasetRouter.get('/', userAuth, getUserDatasets);
datasetRouter.get('/preview/:id', userAuth, previewDataset);
datasetRouter.delete('/delete-dataset/:id', userAuth, deleteDataset);

export default datasetRouter;

//-------------------------------------------
// import pandas as pd
// df = pd.read_csv('uploads/filename.csv')
