import express from 'express';
import userAuth from '../middleware/userAuth.js';
import { getAllUsers, deleteUserById, submitFeedback } from '../controllers/adminController.js';

const adminRouter = express.Router();

adminRouter.get('/users', userAuth, getAllUsers);
adminRouter.delete('/users/:id', userAuth, deleteUserById);
adminRouter.post('/submit-feedback', submitFeedback);

export default adminRouter;
