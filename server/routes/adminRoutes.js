import express from 'express';
import userAuth from '../middleware/userAuth.js';
import adminAuth from '../middleware/adminAuth.js';
import { upload } from '../middleware/upload.js';
import { 
    getAllUsers, 
    adminDeleteUserAccount, 
    getFeedbackList, 
    markFeedbackAsInProcess, 
    markFeedbackAsCompleted, 
    getHomeCardsInfo,
    uploadTemplate
 } from '../controllers/adminController.js';

const adminRouter = express.Router();

adminRouter.get('/users', userAuth, getAllUsers);
adminRouter.delete('/users/:userId', userAuth, adminDeleteUserAccount);
adminRouter.get('/feedback-list', userAuth, adminAuth, getFeedbackList);
adminRouter.put('/feedback/:id/mark-in-process', userAuth, markFeedbackAsInProcess);
adminRouter.put('/feedback/:id/mark-completed', userAuth, markFeedbackAsCompleted);
adminRouter.get('/home-cards-info', userAuth, getHomeCardsInfo);
// Ensure uploader identity is set by auth before multer processes file
adminRouter.post('/upload-dataset-template/:type', userAuth, adminAuth, upload.single('file'), uploadTemplate);

export default adminRouter;