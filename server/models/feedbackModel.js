import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true }, // linked to your user model
    subject: { type: String, required: true },
    description: { type: String, required: true },
    submittedAt: { type: Date, default: Date.now, required: true },
    status: { type: String, enum: ['New', 'Processing', 'Solved'], default: 'New'},
});

const feedbackModel = mongoose.models.feedback || mongoose.model('feedback', feedbackSchema);

export default feedbackModel;
