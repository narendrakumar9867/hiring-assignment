import mongoose from "mongoose";

const questionTypeSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ["mcq", "short_answer", "long_answer", "true_false", "fill_in_blank", "case_study", "diagram", "numerical"],
        required: true,
    },
    count:             { type: Number, required: true, min: 1 },
    marksPerQuestion:  { type: Number, required: true, min: 1 },
}, { _id: false });

const assignmentSchema = new mongoose.Schema({
    // ── Paper identity ──────────────────────────────────────────────────
    title:           { type: String, required: true, trim: true },
    subject:         { type: String, required: true, trim: true },
    topic:           { type: String, default: "" },

    // ── Institution info ────────────────────────────────────────────────
    schoolOrCollegeName: { type: String, default: "" },
    board:               { type: String, default: "" },
    academicYear:        { type: String, default: "" },
    classGrade:          { type: String, default: "" },
    stream:              { type: String, default: "" },
    medium:              { type: String, default: "English" },

    // ── Exam metadata ────────────────────────────────────────────────────
    examType:     { type: String, default: "" },
    timeDuration: { type: String, default: "3 Hours" },
    maximumMarks: { type: String, default: "" },
    passingMarks: { type: String, default: "" },
    examDate:     { type: Date, default: null },
    dueDate:      { type: Date, required: true },

    // ── Content scope ─────────────────────────────────────────────────────
    chapterNames: { type: String, default: "" },

    // ── Question structure ────────────────────────────────────────────────
    questionTypes: { type: [questionTypeSchema], required: true },
    totalMarks:    { type: Number, required: true },
    difficulty: {
        type: String,
        enum: ["easy", "medium", "hard", "mixed"],
        default: "mixed",
    },

    // ── Instructions ──────────────────────────────────────────────────────
    additionalInstructions: { type: String, default: "" },

    // ── Uploaded file ─────────────────────────────────────────────────────
    fileContent: { type: String, default: null },
    fileName:    { type: String, default: null },

    // ── Job state ─────────────────────────────────────────────────────────
    status: {
        type: String,
        enum: ["pending", "processing", "completed", "failed"],
        default: "pending",
    },
    jobId: { type: String, default: null },

    // ── Owner ─────────────────────────────────────────────────────────────
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
}, { timestamps: true });

const Assignment = mongoose.model("Assignment", assignmentSchema);
export default Assignment;