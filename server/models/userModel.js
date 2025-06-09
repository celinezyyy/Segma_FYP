import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username: {type: String, required: true},
    email: {type: String, required: true, unique: true},
    password: {type: String, required: true},
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    verifyOtp: {type: String, default: ''},
    verifyOtpExpiredAt: {type: Number, default: 0},
    isAccountVerified: {type: Boolean, default: false},
    resetOtp: {type: String, default: ''},
    resetOtpExpiredAt: {type: Number, default: 0},
    createdAt: { type: Date, default: Date.now, required: true },
})

const userModel = mongoose.models.user || mongoose.model('user', userSchema);

export default userModel;