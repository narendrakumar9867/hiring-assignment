import mongoose from "mongoose";

const questionTypeSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ["mcq", "short_answer", "long_answer", "true_false", "fill_in_blank"],
        required: true,
    },
    count: {
        type: Number,
        required: true,
        min: 1,
    },
    marksPerQuestion: {
        type: Number,
        required: true,
        min: 1,
    },
}, { _id: false });

const assignmentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    subject: {
        type: String,
        required: true,
        trim: true,
    },
    topic: {
        type: String,
        trim: true,
        default: "",
    },
    dueDate: {
        type: Date,
        required: true,
    },
    questionTypes: {
        type: [questionTypeSchema],
        required: true,
    },
    totalMarks: {
        type: Number,
        required: true,
    },
    difficulty: {
        type: String,
        enum: ["easy", "medium", "hard", "mixed"],
        default: "mixed",
    },
    additionalInstructions: {
        type: String,
        default: "",
    },
    fileContent: {
        type: String,
        default: null,
    },
    fileName: {
        type: String,
        default: null,
    },
    status: {
        type: String,
        enum: ["pending", "processing", "completed", "failed"],
        default: "pending",
    },
    jobId: {
        type: String,
        default: null,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    }
}, { timestamps: true });

const Assignment = mongoose.model("Assignment", assignmentSchema);

export default Assignment;