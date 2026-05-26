import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
    questionNumber: { type: Number, required: true },
    questionText:   { type: String, required: true },
    type: {
        type: String,
        enum: ["mcq", "short_answer", "long_answer", "true_false", "fill_in_blank", "case_study"],
        required: true,
    },
    options:     { type: [String], default: [] },
    difficulty:  { type: String, enum: ["easy", "medium", "hard"], required: true },
    marks:       { type: Number, required: true },
    bloomLevel:  { type: String, default: null },
    alternateQuestion: { type: String, default: null },
}, { _id: false });

const sectionSchema = new mongoose.Schema({
    sectionTitle: { type: String, required: true },
    instruction:  { type: String, default: "Attempt all questions." },
    questions:    { type: [questionSchema], required: true },
    totalMarks:   { type: Number, required: true },
}, { _id: false });

const answerKeySchema = new mongoose.Schema({
    questionNumber: { type: Number },
    answer:         { type: String },
}, { _id: false });

const generatedPaperSchema = new mongoose.Schema({
    assignmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Assignment",
        required: true,
    },

    // ── AI-generated ──────────────────────────────────────────────────────
    title:               { type: String, required: true },
    subject:             { type: String, required: true },
    totalMarks:          { type: Number, required: true },
    timeDuration:        { type: String, default: "3 Hours" },
    generalInstructions: { type: [String], default: [] },
    sections:            { type: [sectionSchema], required: true },
    answerKey:           { type: [answerKeySchema], default: [] },

    // ── Metadata (for PDF header) ─────────────────────────────────────────
    schoolOrCollegeName: { type: String, default: "" },
    address:             { type: String, default: "" },
    board:               { type: String, default: "" },
    academicYear:        { type: String, default: "" },
    classGrade:          { type: String, default: "" },
    stream:              { type: String, default: "" },
    medium:              { type: String, default: "English" },
    examType:            { type: String, default: "" },
    passingMarks:        { type: String, default: null },
    examDate:            { type: String, default: null },
    preparedBy:          { type: String, default: null },
    reviewedBy:          { type: String, default: null },
}, { timestamps: true });

const GeneratedPaper = mongoose.model("GeneratedPaper", generatedPaperSchema);
export default GeneratedPaper;