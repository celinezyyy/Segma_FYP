import userModel from '../models/userModel.js';
import datasetTemplate from '../models/datasetTemplateModel.js';
import feedbackModel from '../models/feedbackModel.js';
import datasetModel from '../models/datasetModel.js';
import segmentationModel from '../models/segmentationModel.js';
import { getGridFSBucket } from '../utils/gridfs.js'; 
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

    console.log('Deleting userId:', userId);

    // 1. Find all datasets and segmentations of this user
    const bucket = getGridFSBucket();
    const datasets = await datasetModel.find({ user: userId });
    const segmentations = await segmentationModel.find({ user: userId });

    for (const dataset of datasets) {
      try {
        if (dataset.fileId) {
          await bucket.delete(dataset.fileId);
        }
      } catch (err) {
        if (err.code !== 'ENOENT') {
          console.error(`⚠️ Failed to delete GridFS dataset file with ID ${dataset.fileId}:`, err.message);
        } else {
          console.warn(`⚠️ Dataset file with ID ${dataset.fileId} already missing`);
        }
      }
    }

    // 2. Delete any merged files created by segmentations
    for (const seg of segmentations) {
      try {
        if (seg.mergedFileId) {
          await bucket.delete(seg.mergedFileId);
        }
      } catch (err) {
        if (err.code !== 'ENOENT') {
          console.error(`⚠️ Failed to delete GridFS merged file with ID ${seg.mergedFileId}:`, err.message);
        } else {
          console.warn(`⚠️ Merged file with ID ${seg.mergedFileId} already missing`);
        }
      }
    }

    // 3. Delete from DB
    await feedbackModel.deleteMany({ user: userId });
    await datasetModel.deleteMany({ user: userId });
    await segmentationModel.deleteMany({ user: userId });
    await datasetTemplate.deleteMany({ uploadedBy: userId });
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
    const { userId } = req;
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Remove old template for this user & type, only if it exists
    const existing = await datasetTemplate.findOne({ uploadedBy: userId, type });
    if (existing) {
      await datasetTemplate.deleteOne({ _id: existing._id });
    }

    // Save new one
    const newTemplate = new datasetTemplate({
      uploadedBy: userId,
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