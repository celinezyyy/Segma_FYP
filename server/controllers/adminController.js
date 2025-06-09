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
export const deleteUserById = async (req, res) => {
  try {
    const deleted = await userModel.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'userModel not found' });
    }
    res.status(200).json({ success: true, message: 'userModel deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
};

export const submitFeedback = async ( req, res) => {
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
