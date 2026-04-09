import mongoose from "mongoose";


const resetPassword = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    token: {
        type: String,
        required: true
    },
    verified: {
        type: Boolean,
        default: false
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 }
    }
}, { timestamps: true });
export default mongoose.model("ResetPassword", resetPassword);