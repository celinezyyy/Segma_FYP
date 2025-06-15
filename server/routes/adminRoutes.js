import express from 'express';
import userAuth from '../middleware/userAuth.js';
import adminAuth from '../middleware/adminAuth.js';
import { getAllUsers, adminDeleteUserAccount, getFeedbackList, markFeedbackAsInProcess, markFeedbackAsCompleted, getHomeCardsInfo } from '../controllers/adminController.js';

const adminRouter = express.Router();

adminRouter.get('/users', userAuth, getAllUsers);
adminRouter.delete('/users/:userId', userAuth, adminDeleteUserAccount);
adminRouter.get('/feedback-list', userAuth, adminAuth, getFeedbackList);
adminRouter.put('/feedback/:id/mark-in-process', userAuth, markFeedbackAsInProcess);
adminRouter.put('/feedback/:id/mark-completed', userAuth, markFeedbackAsCompleted);
adminRouter.get('/home-cards-info', userAuth, getHomeCardsInfo);

export default adminRouter;
