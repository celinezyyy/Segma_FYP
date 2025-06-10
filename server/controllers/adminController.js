import userModel from '../models/userModel.js';
import feedbackModel from '../models/feedbackModel.js';

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

// Delete user by ID
export const adminDeleteUserAccount  = async (req, res) => {
  try {
    const { userId } = req.params; // now target userId is passed in URL param
    
    if (!userId) {
      console.log('❌ No userId received in req.params');
      return res.status(400).json({ success: false, message: "No User Found" });
    }

    console.log('🔍 Deleting userId:', userId);
    // Delete feedbacks linked to user
    await feedbackModel.deleteMany({ user: userId });

    // Delete datasets/reports if needed
    // await datasetModel.deleteMany({ userId });
    // await reportModel.deleteMany({ userId });

    // Finally delete the user
    await userModel.findByIdAndDelete(userId);

    res.status(200).json({ success: true, message: "User account and related data deleted successfully" });
     } catch (err) {
    console.error('Admin delete user error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete user account'});
  }
};

// get feedback 
export const getFeedbackList = async (req, res) => {
  try {
    const feedbacks = await feedbackModel
      .find()
      .sort({ createdAt: -1 })
      .populate('user', 'username email'); // populate user data (only username + email)
    
      console.log('Feedback:', feedbacks);
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