import userModel from "../models/userModel.js";
import { sendOtpEmail } from '../controllers/authController.js';
import feedbackModel from '../models/feedbackModel.js';
import datasetModel from "../models/datasetModel.js";
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


export const getUserData = async (req, res) => {
    try {
        const userId = req.userId;

        const user = await userModel.findById(userId);

        // if user not available
        if(!user){
            return res.json({success: false, message: 'User not found'});
        }

        res.json({
            success: true, 
            userData:{
              _id: user._id,
              username: user.username,
              email: user.email,
              isAccountVerified: user.isAccountVerified
            }
        })
    } catch (error) {
        res.json({success: false, message: error.message});
    }
}

export const updateProfile = async (req, res) => {

    const userId = req.userId; // use the userId from the auth middleware
    const { username, email } = req.body;

  try {
    const user = await userModel.findById(userId);

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    const emailChanged = user.email !== email;
    const usernameChanged = user.username !== username;

    if (emailChanged) {
      const existingUser = await userModel.findOne({ email });
      if (existingUser) {
        return res.json({ success: false, message: "Email already exists" });
      }

      user.email = email;
      user.isAccountVerified = false;

      // ✅ Send OTP for new email
      await sendOtpEmail(user, "verify");
    }

    if (usernameChanged) {
      user.username = username;
    }

    await user.save();

    return res.json({
      success: true,
      emailChanged,
      usernameChanged,
      userId: user._id,
      message: emailChanged
        ? "Email updated. Please verify your new email."
        : "Profile updated successfully",
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// export const deleteAccount = async (req, res) => {
//   console.log("DELETE /delete-account route hit");
//     try {
//     const userId = req.userId; // JWT middleware sets req.user
    
//     if (!userId) {
//       return res.status(400).json({ success: false, message: "No userId found" });
//     }
    
//     await feedbackModel.deleteMany({ user: userId });
//     await datasetModel.deleteMany({ user: userId });
//     await userModel.findByIdAndDelete(userId);
//     // Delete user record
//     // If you have related collections like Dataset, Report in future, you'd also delete them here
//     // await Dataset.deleteMany({ userId });
//     // await Report.deleteMany({ userId });

//     res.clearCookie('token'); // 'token' is the cookie name store in frontend
//     res.status(200).json({ success: true, message: "Account deleted successfully" });
//   } catch (err) {
//     console.error("Delete account error:", err.message);
//     res.status(500).json({ success: false, message: "Failed to delete account" });
//   }
// }

// submit feedback


export const deleteAccount = async (req, res) => {
  console.log("DELETE /delete-account route hit");
  try {
    const userId = req.userId; // JWT middleware sets req.user

    if (!userId) {
      return res.status(400).json({ success: false, message: "No userId found" });
    }

    // 🔍 Step 1: Get all datasets linked to the user
    const datasets = await datasetModel.find({ user: userId });

    for (const dataset of datasets) {
      const filePath = path.join(__dirname, '..', 'datasets', userId, dataset.type, dataset.filename);
      
      try {
        await fs.unlink(filePath);
        console.log(`✅ Deleted file: ${filePath}`);
      } catch (err) {
        if (err.code !== 'ENOENT') {
          console.error(`⚠️ Error deleting file ${filePath}:`, err.message);
        } else {
          console.warn(`⚠️ File already missing: ${filePath}`);
        }
      }
    }

    // 🔄 Step 2: Clean up user folder (optional, but neat)
    const userFolderPath = path.join(__dirname, '..', 'datasets', userId);
    try {
      await fs.rm(userFolderPath, { recursive: true, force: true });
      console.log(`🧹 Deleted folder: ${userFolderPath}`);
    } catch (err) {
      console.error(`⚠️ Failed to delete user folder: ${err.message}`);
    }

    // 🗑️ Step 3: Delete from MongoDB
    await feedbackModel.deleteMany({ user: userId });
    await datasetModel.deleteMany({ user: userId });
    await userModel.findByIdAndDelete(userId);

    res.clearCookie('token'); // Clear login cookie
    res.status(200).json({ success: true, message: "Account deleted successfully" });

  } catch (err) {
    console.error("❌ Delete account error:", err.message);
    res.status(500).json({ success: false, message: "Failed to delete account" });
  }
};

export const submitFeedback = async (req, res) => {
  try {
        const { userId, subject, description } = req.body;
        console.log('Userid:', userId);

        if (!userId || !subject || !description) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const newFeedback = new feedbackModel({
            user: userId,
            subject,
            description,
        });

        await newFeedback.save();

        res.json({ success: true, message: 'Feedback submitted successfully' });
    } catch (err) {
        console.error('Error submitting feedback:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}