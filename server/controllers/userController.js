import userModel from "../models/userModel.js";
import { sendOtpEmail } from '../controllers/authController.js'; 

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
  console.log("DELETE /delete-account route hit");
    try {
    const userId = req.userId; // JWT middleware sets req.user
    console.log("userId to delete:", userId);
    // Delete user record
    await userModel.findByIdAndDelete(userId);
        if (!userId) {
            return res.status(400).json({ success: false, message: "No userId found" });
        }

    // If you have related collections like Dataset, Report in future, you'd also delete them here
    // await Dataset.deleteMany({ userId });
    // await Report.deleteMany({ userId });

    res.clearCookie('token'); // 'token' is the cookie name store in frontend
    res.status(200).json({ success: true, message: "Account deleted successfully" });
  } catch (err) {
    console.error("Delete account error:", err.message);
    res.status(500).json({ success: false, message: "Failed to delete account" });
  }
}