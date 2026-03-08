import mongoose from "mongoose";

const DOC_NAME = "Test";
const COLLECTION_NAME = "tests";

const testSchema = new mongoose.Schema({
    test: {
        type: String,
    }
},{
    collection: COLLECTION_NAME,
    timestamps: true
})

export default mongoose.model(DOC_NAME, testSchema);