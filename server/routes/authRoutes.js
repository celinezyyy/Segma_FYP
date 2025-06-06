import express from "express";
import {login, logout, register, sendResetOtp, verifyEmail, resetPassword, isAuthenticated } from "../controllers/authController.js";
import userAuth from "../middleware/userAuth.js";

const authRouter = express.Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/logout', logout);
authRouter.post('/verify-account', userAuth, verifyEmail);
authRouter.post('/send-reset-otp', sendResetOtp);
authRouter.post('/reset-password', resetPassword);
authRouter.get('/is-auth', userAuth, isAuthenticated)

export default authRouter;