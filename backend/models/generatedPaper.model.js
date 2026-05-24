import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
    questionNumber: { 
        type: Number, 
        required: true 
    },
    questionText: { 
        type: String, 
        required: true 
    },
    type: {
        type: String,
        enum: ["mcq", "short_answer", "long_answer", "true_false", "fill_in_blank"],
        required: true,
    },
    options: { 
        type: [String], 
        default: [] 
    },
    difficulty: {
        type: String,
        enum: ["easy", "medium", "hard"],
        required: true,
    },
    marks: { 
        type: Number, 
        required: true 
    },
}, { _id: false });

const sectionSchema = new mongoose.Schema({
    sectionTitle: { 
        type: String, 
        required: true 
    },
    instruction: { 
        type: String, 
        default: "Attempt all questions" 
    },
    questions: { 
        type: [questionSchema], 
        required: true 
    },
    totalMarks: { 
        type: Number, 
        required: true 
    },
}, { _id: false });

const generatedPaperSchema = new mongoose.Schema({
    assignmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Assignment",
        required: true,
    },
    title: { 
        type: String, 
        required: true 
    },
    subject: { 
        type: String, 
        required: true 
    },
    schoolOrCollegeName: {
        type: String,
        default: "",
    },
    address: {
        type: String,
        default: "",
    },
    totalMarks: { 
        type: Number, 
        required: true 
    },
    duration: { 
        type: String, 
        default: null 
    },
    generalInstructions: { 
        type: [String], 
        default: [] 
    },
    answerKey: {
        type: [new mongoose.Schema({
            questionNumber: { type: Number, required: true },
            answer: { type: String, required: true },
        }, { _id: false })],
        default: [],
    },
    sections: { 
        type: [sectionSchema], 
        required: true 
    },
}, { timestamps: true });

const GeneratedPaper = mongoose.model("GeneratedPaper", generatedPaperSchema);

export default GeneratedPaper;