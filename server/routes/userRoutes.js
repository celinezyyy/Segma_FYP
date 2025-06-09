import express from 'express';
import userAuth from '../middleware/userAuth.js';
import { getUserData } from '../controllers/userController.js';
import { updateProfile } from '../controllers/userController.js';
import { deleteAccount } from '../controllers/userController.js';

const userRouter = express.Router();

userRouter.get('/data', userAuth, getUserData);
userRouter.post('/update-profile', userAuth, updateProfile);
userRouter.delete('/delete-account', userAuth, deleteAccount);

export default userRouter;