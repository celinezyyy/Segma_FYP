import express from 'express';
import userAuth from '../middleware/userAuth.js';
import { getAllUsers, deleteUserById } from '../controllers/adminController.js';

const adminRouter = express.Router();

adminRouter.get('/users', userAuth, getAllUsers);
adminRouter.delete('/users/:id', userAuth, deleteUserById);

export default adminRouter;
