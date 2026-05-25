import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");
import Assignment from "../models/assignment.model.js";
import GeneratedPaper from "../models/generatedPaper.model.js";
import assignmentQueue, { addGenerationJob } from "../queues/assignment.queue.js";
import redis from "../config/redis.js";

export const createAssignment = async (req, res) => {
    try {
        const { title, subject, topic, dueDate, difficulty, additionalInstructions, voiceTranscript } = req.body;
        let { questionTypes } = req.body;

        // questionTypes comes as JSON string when using multipart/form-data
        if (typeof questionTypes === "string") {
            questionTypes = JSON.parse(questionTypes);
        }

        if (!title || !subject || !dueDate || !questionTypes) {
            return res.status(400).json({ message: "title, subject, dueDate, and questionTypes are required." });
        }

        if (!Array.isArray(questionTypes) || questionTypes.length === 0) {
            return res.status(400).json({ message: "questionTypes must be a non-empty array." });
        }

        for (const qt of questionTypes) {
            if (!qt.type || !qt.count || !qt.marksPerQuestion) {
                return res.status(400).json({ message: "Each questionType needs type, count, and marksPerQuestion." });
            }
            if (Number(qt.count) < 1 || Number(qt.marksPerQuestion) < 1) {
                return res.status(400).json({ message: "count and marksPerQuestion must be positive." });
            }
        }

        const totalMarks = questionTypes.reduce(
            (sum, qt) => sum + Number(qt.count) * Number(qt.marksPerQuestion), 0
        );

        // Parse uploaded PDF/text file
        let fileContent = null;
        let fileName = null;

        if (req.file) {
            try {
                if (req.file.mimetype === "application/pdf") {
                    const parsed = await pdfParse(req.file.buffer);
                    fileContent = parsed.text;
                } else {
                    fileContent = req.file.buffer.toString("utf-8");
                }
                fileName = req.file.originalname;
            } catch (err) {
                console.log("File parse error (non-blocking):", err.message);
            }
        }

        const normalizedAdditionalInstructions = [additionalInstructions, voiceTranscript]
            .filter(Boolean)
            .map((value) => String(value).trim())
            .filter(Boolean)
            .join(" ")
            .trim();

        const assignment = new Assignment({
            title,
            subject,
            topic: topic || "",
            dueDate,
            questionTypes,
            totalMarks,
            difficulty: difficulty || "mixed",
            additionalInstructions: normalizedAdditionalInstructions,
            fileContent,
            fileName,
            status: "pending",
            createdBy: req.user._id,
        });

        await assignment.save();

        // Add job to BullMQ
        const job = await addGenerationJob(assignment._id.toString(), {
            title,
            subject,
            topic: topic || "",
            questionTypes: assignment.questionTypes,
            difficulty: assignment.difficulty,
            additionalInstructions: normalizedAdditionalInstructions,
            fileContent,
            schoolOrCollegeName: req.user.schoolOrCollegeName || "",
            address: req.user.address || "",
        });

        assignment.jobId = job.id;
        await assignment.save();

        res.status(201).json({
            message: "Assignment created. Generation started.",
            assignmentId: assignment._id,
            jobId: job.id,
            totalMarks,
            status: "pending",
        });
    } catch (error) {
        console.log("Error in createAssignment:", error.message);
        res.status(500).json({ message: "Internal server error." });
    }
};

export const getAssignmentStatus = async (req, res) => {
    try {
        const { assignmentId } = req.params;

        const assignment = await Assignment.findById(assignmentId).select("-fileContent");
        if (!assignment) {
            return res.status(404).json({ message: "Assignment not found." });
        }

        if (assignment.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Access denied." });
        }

        res.status(200).json({
            assignmentId: assignment._id,
            title: assignment.title,
            status: assignment.status,
            jobId: assignment.jobId,
        });
    } catch (error) {
        console.log("Error in getAssignmentStatus:", error.message);
        res.status(500).json({ message: "Internal server error." });
    }
};

export const getGeneratedPaper = async (req, res) => {
    try {
        const { assignmentId } = req.params;

        const assignment = await Assignment.findById(assignmentId).select("createdBy");
        if (!assignment) {
            return res.status(404).json({ message: "Assignment not found." });
        }

        if (assignment.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Access denied." });
        }

        const cached = await redis.get(`paper:${assignmentId}`);
        if (cached) {
            console.log("Returning cached paper for:", assignmentId);
            return res.status(200).json({ fromCache: true, paper: JSON.parse(cached) });
        }

        const paper = await GeneratedPaper.findOne({ assignmentId })
            .populate("assignmentId", "title subject dueDate totalMarks");

        if (!paper) {
            return res.status(404).json({ message: "Paper not found. It may still be processing." });
        }

        res.status(200).json({ fromCache: false, paper });
    } catch (error) {
        console.log("Error in getGeneratedPaper:", error.message);
        res.status(500).json({ message: "Internal server error." });
    }
};

export const getAllAssignments = async (req, res) => {
    try {
        const assignments = await Assignment.find({ createdBy: req.user._id })
            .select("-fileContent")
            .sort({ createdAt: -1 });

        res.status(200).json({ assignments });
    } catch (error) {
        console.log("Error in getAllAssignments:", error.message);
        res.status(500).json({ message: "Internal server error." });
    }
};

export const regeneratePaper = async (req, res) => {
    try {
        const { assignmentId } = req.params;

        const assignment = await Assignment.findById(assignmentId);
        if (!assignment) {
            return res.status(404).json({ message: "Assignment not found." });
        }

        // Remove old paper + cache
        await GeneratedPaper.deleteOne({ assignmentId });
        await redis.del(`paper:${assignmentId}`);

        assignment.status = "pending";
        await assignment.save();

        // Re-queue
        const job = await addGenerationJob(assignment._id.toString(), {
            title: assignment.title,
            subject: assignment.subject,
            topic: assignment.topic,
            questionTypes: assignment.questionTypes,
            difficulty: assignment.difficulty,
            additionalInstructions: assignment.additionalInstructions,
            fileContent: assignment.fileContent,
            schoolOrCollegeName: req.user.schoolOrCollegeName || "",
            address: req.user.address || "",
        });

        assignment.jobId = job.id;
        await assignment.save();

        res.status(200).json({
            message: "Regeneration started.",
            assignmentId: assignment._id,
            jobId: job.id,
        });
    } catch (error) {
        console.log("Error in regeneratePaper:", error.message);
        res.status(500).json({ message: "Internal server error." });
    }
};

export const deleteAssignment = async (req, res) => {
    try {
        const { assignmentId } = req.params;

        const assignment = await Assignment.findById(assignmentId);
        if (!assignment) {
            return res.status(404).json({ message: "Assignment not found." });
        }

        if (assignment.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Access denied." });
        }

        if (assignment.jobId) {
            try {
                const job = await assignmentQueue.getJob(assignment.jobId);
                if (job) {
                    await job.remove();
                }
            } catch (queueError) {
                console.log("Skipping queued job cleanup:", queueError.message);
            }
        }

        await Promise.allSettled([
            GeneratedPaper.deleteOne({ assignmentId }),
            redis.del(`paper:${assignmentId}`),
        ]);

        await Assignment.deleteOne({ _id: assignmentId });

        res.status(200).json({
            message: "Assignment deleted successfully.",
            assignmentId,
        });
    } catch (error) {
        console.log("Error in deleteAssignment:", error.message);
        res.status(500).json({ message: "Internal server error." });
    }
};
