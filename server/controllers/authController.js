import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import userModel from '../models/userModel.js';
import transporter from '../config/nodemailer.js';
import { EMAIL_VERIFY_TEMPLATE, PASSWORD_RESET_TEMPLATE } from '../config/emailTemplete.js';

// Helper Function: Send OTP Email
export const sendOtpEmail = async (user, type = 'verify') => {
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const now = Date.now();

    if (type === 'verify') {
        user.verifyOtp = otp;
        user.verifyOtpExpiredAt = now + 15 * 60 * 1000; // 15 min
    } else if (type === 'reset') {
        user.resetOtp = otp;
        user.resetOtpExpiredAt = now + 15 * 60 * 1000;
    }

    await user.save();

    const mailOptions = {
        from: process.env.SENDER_EMAIL,
        to: user.email,
        subject: type === 'verify' ? 'Segma - Account Verification OTP' : 'Segma - Password Reset OTP',
        text: `Your OTP is ${otp}. Use this to ${type === 'verify' ? 'verify your account' : 'reset your password'}. The OTP will expire in ${type === 'verify' ? '24 hours' : '15 minutes'}.`,
        html: (type === 'verify'
            ? EMAIL_VERIFY_TEMPLATE
            : PASSWORD_RESET_TEMPLATE
        )
            .replace("{{otp}}", otp)
            .replace("{{email}}", user.email)
    };

    await transporter.sendMail(mailOptions);
};

// Register
export const register = async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.json({ success: false, message: 'Missing Details' });
    }

    try {
        const existingUser = await userModel.findOne({ email });

        if (existingUser) {
            return res.json({ success: false, message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new userModel({ username, email, password: hashedPassword });
        await user.save();

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        await sendOtpEmail(user, 'verify');

        return res.json({ success: true, userId: user._id });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// 🔐 Login
export const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.json({ success: false, message: 'Email and password are required' });
    }

    try {
        const user = await userModel.findOne({ email });

        if (!user) {
            return res.json({ success: false, message: 'Invalid email' });
        }

        if (!user.isAccountVerified) {
            await sendOtpEmail(user, 'verify');
            return res.json({ success: false, message: 'Please verify your email before logging in', userId: user._id  });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.json({ success: false, message: 'Invalid password' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.json({ success: true });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// 🔓 Logout
export const logout = async (req, res) => {
    try {
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        });

        return res.json({ success: true, message: 'Logged Out' });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// Verify Email
export const verifyEmail = async (req, res) => {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
        return res.json({ success: false, message: 'Missing Details' });
    }

    try {
        const user = await userModel.findById(userId);

        if (!user) {
            return res.json({ success: false, message: 'User not found' });
        }
        if (user.verifyOtp !== otp) {
            return res.json({ success: false, message: 'Incorrect OTP' });
        }

        if (user.verifyOtpExpiredAt < Date.now()) {
            return res.json({ success: false, message: 'OTP Expired' });
        }

        user.isAccountVerified = true;
        user.verifyOtp = '';
        user.verifyOtpExpiredAt = 0;
        await user.save();

        return res.json({ success: true, message: 'Email Verified successfully' });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// Reset Password, send new OTP to reset password
export const sendResetOtp = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.json({ success: false, message: 'Email is required' });
    }

    try {
        const user = await userModel.findOne({ email });

        if (!user) {
            return res.json({ success: false, message: 'User not found' });
        }

        await sendOtpEmail(user, 'reset');
        return res.json({ success: true, message: 'OTP sent to your email' });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// 🔐 Reset Password
export const resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
        return res.json({ success: false, message: 'Email, OTP, and new password are required' });
    }

    try {
        const user = await userModel.findOne({ email });

        if (!user || user.resetOtp !== otp) {
            return res.json({ success: false, message: 'Invalid OTP' });
        }

        if (user.resetOtpExpiredAt < Date.now()) {
            return res.json({ success: false, message: 'OTP Expired' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.resetOtp = '';
        user.resetOtpExpiredAt = 0;
        await user.save();

        return res.json({ success: true, message: 'Password has been reset successfully' });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// Check is user authenticatedAdd commentMore actions
export const isAuthenticated = async (req, res) => {
    try {
        return res.json({success:true});
    } catch (error) {
        res.json({success:false, message: error.message});
    }
}