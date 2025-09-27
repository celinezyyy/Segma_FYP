import userModel from '../models/userModel.js';
import DatasetTemplate from '../models/datasetTemplateModel.js';
import feedbackModel from '../models/feedbackModel.js';
import datasetModel from '../models/datasetModel.js';
import { getGridFSBucket } from '../utils/gridfs.js'; 
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Get all users with role: 'user'
export const getAllUsers = async (req, res) => {
  try {
    const users = await userModel.find({ role: 'user' }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, users });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
};

// delete user account and all associated data if user deleted by admin
export const adminDeleteUserAccount = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ success: false, message: "No User Found" });
    }

    console.log('🔍 Deleting userId:', userId);

    // 1. Find all datasets of this user
    const datasets = await datasetModel.find({ user: userId });
    const bucket = getGridFSBucket();

    for (const dataset of datasets) {
      try {
        await bucket.delete(dataset.fileId);
      } catch (err) {
        if (err.code !== 'ENOENT') {
          console.error(`⚠️ Failed to delete GridFS file with ID ${dataset.fileId}:`, err.message);
        } else {
          console.warn(`⚠️ File with ID ${dataset.fileId} already missing`);
        }
      }
    }

    // 3. Delete from DB
    await feedbackModel.deleteMany({ user: userId });
    await datasetModel.deleteMany({ user: userId });
    await userModel.findByIdAndDelete(userId);

    res.status(200).json({ success: true, message: "User and data deleted successfully" });

  } catch (err) {
    console.error('❌ Server error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete user account' });
  }
};

// get feedback 
export const getFeedbackList = async (req, res) => {
  try {
    const feedbacks = await feedbackModel
      .find()
      .sort({ createdAt: -1 })
      .populate('user', 'username email'); // populate user data (only username + email)
  
    res.json({ success: true, feedbacks });
  } catch (err) {
    console.error('Error fetching feedback:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// handle view(process) button
export const markFeedbackAsInProcess = async (req, res) => {
  try {
    const { id } = req.params;

    const feedback = await feedbackModel.findById(id);

    if (!feedback) {
      return res.status(404).json({ success: false, message: 'Feedback not found' });
    }

    if (feedback.status === 'Solved' || feedback.status === 'Processing') {
      return res.status(400).json({ success: false, message: 'Feedback is already processed' });
    }

    feedback.status = 'Processing';
    await feedback.save();

    res.status(200).json({ success: true, message: 'Feedback marked as In Process', feedback });
  } catch (err) {
    console.error('Error updating feedback status:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// handle complete button
export const markFeedbackAsCompleted = async (req, res) => {
  try {
    const { id } = req.params;

    const feedback = await feedbackModel.findById(id);

    if (!feedback) {
      return res.status(404).json({ success: false, message: 'Feedback not found' });
    }

    if (feedback.status === 'Solved') {
      return res.status(400).json({ success: false, message: 'Feedback is already solved' });
    }

    feedback.status = 'Solved';
    await feedback.save();

    res.status(200).json({ success: true, message: 'Feedback marked as Solved', feedback});
  } catch (err) {
    console.error('Error updating feedback status:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// get Home card info
export const getHomeCardsInfo = async (req, res) => {
  try {
    const userCount = await userModel.countDocuments({ role: 'user' });
    const feedbackCount = await feedbackModel.countDocuments();
    const resolvedFeedbackCount = await feedbackModel.countDocuments({ status: 'Solved' });
    
    res.json({
      success: true,
      metrics: {
        users: userCount,
        feedback: feedbackCount,
        resolved: resolvedFeedbackCount
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// upload dataset template
export const uploadTemplate = async (req, res) => {
  try {
    const { type } = req.params;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Remove old template of this type
    await DatasetTemplate.findOneAndDelete({ type });

    // Save new one
    const newTemplate = new DatasetTemplate({
      type,
      fileName: req.file.originalname,
      mimetype: req.file.mimetype,
      data: req.file.buffer,   
    });

    await newTemplate.save();

    res.json({ success: true, message: `${type} template uploaded successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};