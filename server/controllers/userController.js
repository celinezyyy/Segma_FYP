import userModel from "../models/userModel.js";
import { sendOtpEmail } from '../controllers/authController.js';
import feedbackModel from '../models/feedbackModel.js';
import datasetModel from "../models/datasetModel.js";
import { getGridFSBucket } from '../utils/gridfs.js';
import datasetTemplate from "../models/datasetTemplateModel.js";
import segmentationModel from "../models/segmentationModel.js";

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

export const deleteAccount = async (req, res) => {
  console.log(">>>>>>>>>>>>>>>>>ENTRY: /delete-account route");
  try {
    const userId = req.userId; // JWT middleware sets req.user

    if (!userId) {
      return res.status(400).json({ success: false, message: "No userId found" });
    }

    // Step 1: Get all datasets and segmentations linked to the user
    const bucket = getGridFSBucket();
    const datasets = await datasetModel.find({ user: userId });
    const segFilter = { user: userId };
    const segmentations = await segmentationModel.find(segFilter, { _id: 1, mergedFileId: 1 }).lean();

    // Step 2: Delete GridFS files for datasets
    for (const dataset of datasets) {
      try {
        if (dataset.fileId) {
          await bucket.delete(dataset.fileId);
        }
      } catch (err) {
        if (err.code !== 'ENOENT') {
          console.error(`Error deleting dataset GridFS fileId ${dataset.fileId}:`, err.message);
        } else {
          console.warn(`Dataset GridFS file already missing: ${dataset.fileId}`);
        }
      }
    }

    // Step 2b: Delete GridFS merged files created by segmentations
    for (const seg of segmentations) {
      try {
        if (seg.mergedFileId) {
          await bucket.delete(seg.mergedFileId);
        }
      } catch (e) {
        if (e.code !== 'ENOENT') {
          console.warn('Failed deleting merged GridFS file', e?.message);
        } else {
          console.warn(`Merged file already missing: ${seg.mergedFileId}`);
        }
      }
    }

    // Step 3: Delete from MongoDB
    await feedbackModel.deleteMany({ user: userId });
    await datasetModel.deleteMany({ user: userId });
    await segmentationModel.deleteMany({ user: userId });
    // Also delete any dataset templates uploaded by this user (admin self-delete supported)
    await datasetTemplate.deleteMany({ uploadedBy: userId });
    await userModel.findByIdAndDelete(userId);

    res.clearCookie('token'); // Clear login cookie
    res.status(200).json({ success: true, message: "Account deleted successfully with dataset and segmentation cleanup" });
    console.log(">>>>>>>>>>>>>>>>>EXIT: /delete-account route");
  } catch (err) {
    console.error("Delete account error:", err.message);
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

// get feedback 
export const viewFeedbackStatus = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const feedbacks = await feedbackModel
      .find({ user: req.userId }) // use userId from middleware
      .sort({ createdAt: -1 })
      .populate('user', 'username email');

    res.json({ success: true, feedbacks });
  } catch (err) {
    console.error('Error fetching feedback:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
