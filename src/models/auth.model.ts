import mongoose from "mongoose";

const DOC_NAME = "Auth";
const COLLECTION_NAME = "auths";


const authSchema = new mongoose.Schema({
    userName: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    refreshToken: {
        type: String,
        default: null
    },
    types: {
        type: String,
        enum: ["login", "login-google"],
        default: "login"
    },
    lockEnd: {
        type: Date,
        default: null
    },
    lockReason: {
        type: String,
        default: null
    }
}, {
    timestamps: true,
    collection: COLLECTION_NAME
})
export default mongoose.model(DOC_NAME, authSchema);