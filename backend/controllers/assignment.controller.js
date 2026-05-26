// ─── pdf-parse v2 class-based import ─────────────────────────────────────
import { PDFParse } from "pdf-parse";
console.log('[Controller][Diag] pdf-parse export type:', typeof PDFParse);

import Assignment from "../models/assignment.model.js";
import GeneratedPaper from "../models/generatedPaper.model.js";
import assignmentQueue, { addGenerationJob } from "../queues/assignment.queue.js";
import redis from "../config/redis.js";
import { extractTemplateFields, prepareFileContent } from "../services/ai.service.js";

// ─── Tesseract lazy loader ────────────────────────────────────────────────
const loadTesseract = async () => {
    try {
        const mod = await import("tesseract.js");
        return mod.createWorker || null;
    } catch {
        return null;
    }
};

const parseQuestionTypes = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === "string" && value.trim()) return JSON.parse(value);
    return [];
};

const buildGenerationJobData = (assignment, user, overrides = {}) => ({
    title: assignment.title,
    subject: assignment.subject,
    topic: assignment.topic,
    schoolOrCollegeName: assignment.schoolOrCollegeName || user?.schoolOrCollegeName || "",
    address: user?.address || "",
    board: assignment.board || "",
    academicYear: assignment.academicYear || "",
    classGrade: assignment.classGrade || "",
    stream: assignment.stream || "",
    medium: assignment.medium || "English",
    examType: assignment.examType || "",
    timeDuration: assignment.timeDuration || "3 Hours",
    maximumMarks: assignment.maximumMarks || "",
    passingMarks: assignment.passingMarks || "",
    chapterNames: assignment.chapterNames || "",
    topicsCovered: assignment.topic || "",
    difficulty: assignment.difficulty || "medium",
    questionTypes: assignment.questionTypes || [],
    internalChoices: false,
    learningOutcomes: assignment.learningOutcomes || "",
    preparedBy: assignment.preparedBy || "",
    reviewedBy: assignment.reviewedBy || "",
    additionalInstructions: assignment.additionalInstructions || "",
    ...overrides,
});

// ─── Extract text from uploaded file ─────────────────────────────────────
const extractTextFromUpload = async (file) => {
    if (!file) return { fileContent: null, fileName: null };

    try {
        // ── PDF ──────────────────────────────────────────────────────────
        if (file.mimetype === "application/pdf") {
            try {
                if (typeof PDFParse !== "function") {
                    throw new Error("PDFParse export not available");
                }

                const parser = new PDFParse({ data: file.buffer });
                const data = await parser.getText();
                await parser.destroy?.();
                const text = String(data?.text || "").trim();
                if (text.length > 30) {
                    console.log(`[PDF] Extracted ${text.length} chars from "${file.originalname}"`);
                    return { fileContent: text, fileName: file.originalname };
                }
                console.log("[PDF] pdf-parse returned empty text, trying OCR...");
            } catch (pdfErr) {
                console.log("[PDF] pdf-parse error:", pdfErr?.message || pdfErr);
            }

            // Fallback OCR for scanned PDFs
            try {
                const createWorker = await loadTesseract();
                if (createWorker) {
                    const worker = await createWorker("eng");
                    const { data: { text: ocrText } } = await worker.recognize(file.buffer);
                    await worker.terminate();
                    if (ocrText?.trim()) {
                        console.log(`[PDF] OCR extracted ${ocrText.length} chars`);
                        return { fileContent: ocrText.trim(), fileName: file.originalname };
                    }
                }
            } catch (ocrErr) {
                console.log("[PDF] OCR fallback failed:", ocrErr.message);
            }
        }

        // ── Images ───────────────────────────────────────────────────────
        if (file.mimetype?.startsWith("image/")) {
            try {
                const createWorker = await loadTesseract();
                if (createWorker) {
                    const worker = await createWorker("eng");
                    const { data: { text: ocrText } } = await worker.recognize(file.buffer);
                    await worker.terminate();
                    if (ocrText?.trim()) {
                        console.log(`[Image] OCR extracted ${ocrText.length} chars`);
                        return { fileContent: ocrText.trim(), fileName: file.originalname };
                    }
                }
            } catch (ocrErr) {
                console.log("[Image] OCR failed:", ocrErr.message);
            }
        }

        // ── Plain text ───────────────────────────────────────────────────
        if (file.mimetype === "text/plain") {
            const text = file.buffer.toString("utf-8").trim();
            console.log(`[TXT] Read ${text.length} chars`);
            return { fileContent: text, fileName: file.originalname };
        }

        return { fileContent: null, fileName: file.originalname };
    } catch (err) {
        console.log("[Extraction] Unexpected error:", err.message);
        return { fileContent: null, fileName: file.originalname };
    }
};

// ─── Create Assignment ────────────────────────────────────────────────────
export const createAssignment = async (req, res) => {
    try {
        const questionTypes = parseQuestionTypes(req.body.questionTypes);

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
        if (!req.body.dueDate) {
            return res.status(400).json({ message: "dueDate is required." });
        }

        // ── Step 1: Extract PDF text ──────────────────────────────────────
        const { fileContent, fileName } = await extractTextFromUpload(req.file);

        // If the client uploaded a file but extraction returned no usable text,
        // fail fast to avoid queuing a generation that will be ungrounded.
        if (req.file && (!fileContent || String(fileContent).trim().length < 20)) {
            console.log('[Controller] Uploaded file present but extraction returned empty; rejecting request.');
            return res.status(400).json({ message: 'Uploaded file could not be parsed. Please upload a searchable PDF or a clear, high-resolution scan.' });
        }

        // ── Step 2: Parse template fields from extracted text ─────────────
        // This is where school name, subject, class etc. come from the PDF
        const tf = fileContent ? extractTemplateFields(fileContent) : {};
        console.log("[Controller] Template fields extracted from PDF:", tf);

        // ── Step 3: Merge — PDF fields WIN over frontend form values ──────
        // Frontend sends subject="General", title="filename" as fallbacks.
        // PDF-extracted values always take priority.
        const subject = tf.subjectName
            || (req.body.subject && req.body.subject !== "General" ? req.body.subject : "")
            || "General";

        const title = tf.paperTitle
            || (req.body.title && req.body.title !== "Assignment" ? req.body.title : "")
            || fileName?.replace(/\.[^.]+$/, "")
            || "Question Paper";

        const classGrade        = tf.classGrade       || req.body.classGrade    || "";
        const board             = tf.board             || req.body.board         || "";
        const schoolOrCollege   = tf.schoolOrCollegeName || req.user?.schoolOrCollegeName || "";
        const academicYear      = tf.academicYear      || req.body.academicYear  || "";
        const stream            = tf.stream            || req.body.stream        || "";
        const examType          = tf.examType          || req.body.examType      || "";
        const timeDuration      = tf.timeDuration      || req.body.timeDuration  || "3 Hours";
        const maximumMarks      = tf.maximumMarks      || req.body.maximumMarks  || "";
        const passingMarks      = tf.passingMarks      || req.body.passingMarks  || "";
        const medium            = tf.medium            || req.body.medium        || "English";
        const chapterNames      = tf.chapterNames      || req.body.chapterNames  || "";
        const topicsCovered     = tf.topicsCovered     || req.body.topic         || "";
        const difficulty        = tf.difficulty        || req.body.difficulty    || "mixed";
        const learningOutcomes  = tf.learningOutcomes  || "";
        const preparedBy        = req.body.preparedBy  || "";
        const reviewedBy        = req.body.reviewedBy  || "";

        const additionalInstructions = [
            req.body.additionalInstructions,
            req.body.voiceTranscript,
            tf.additionalNotes,
        ]
            .filter(Boolean)
            .map(v => String(v).trim())
            .filter(Boolean)
            .join(" ")
            .trim();

        const totalMarks = questionTypes.reduce(
            (sum, qt) => sum + Number(qt.count) * Number(qt.marksPerQuestion), 0
        );

        // ── Step 4: Save assignment ───────────────────────────────────────
        const assignment = new Assignment({
            title,
            subject,
            topic:              topicsCovered,
            classGrade,
            board,
            schoolOrCollegeName: schoolOrCollege,
            academicYear,
            stream,
            examType,
            timeDuration,
            maximumMarks,
            passingMarks,
            medium,
            chapterNames,
            dueDate:            req.body.dueDate,
            questionTypes,
            totalMarks,
            difficulty,
            additionalInstructions,
            fileContent,
            fileName,
            status: "pending",
            createdBy: req.user._id,
        });

        await assignment.save();

        // ── Step 5: Queue the generation job ─────────────────────────────
        const job = await addGenerationJob(
            assignment._id.toString(),
            buildGenerationJobData(assignment, req.user, {
                topic: topicsCovered,
                schoolOrCollegeName: schoolOrCollege,
                address: req.user?.address || "",
                board,
                academicYear,
                classGrade,
                stream,
                medium,
                examType,
                timeDuration,
                maximumMarks,
                passingMarks,
                chapterNames,
                topicsCovered,
                difficulty,
                questionTypes: assignment.questionTypes,
                learningOutcomes,
                preparedBy,
                reviewedBy,
                additionalInstructions,
                fileContent,
            })
        );

        assignment.jobId = job.id;
        await assignment.save();

        console.log(`[Controller] Assignment ${assignment._id} → job ${job.id} | subject="${subject}" class="${classGrade}" board="${board}"`);

        res.status(201).json({
            message: "Assignment created. Generation started.",
            assignmentId: assignment._id,
            jobId: job.id,
            totalMarks,
            status: "pending",
        });
    } catch (err) {
        console.log("[Controller] createAssignment error:", err.message);
        res.status(500).json({ message: "Internal server error." });
    }
};

// ─── Get Assignment Status ────────────────────────────────────────────────
export const getAssignmentStatus = async (req, res) => {
    try {
        const { assignmentId } = req.params;
        const assignment = await Assignment.findById(assignmentId).select("-fileContent");
        if (!assignment) return res.status(404).json({ message: "Assignment not found." });
        if (assignment.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Access denied." });
        }
        res.status(200).json({
            assignmentId: assignment._id,
            title: assignment.title,
            status: assignment.status,
            jobId: assignment.jobId,
        });
    } catch (err) {
        console.log("[Controller] getAssignmentStatus error:", err.message);
        res.status(500).json({ message: "Internal server error." });
    }
};

// ─── Get Generated Paper ──────────────────────────────────────────────────
export const getGeneratedPaper = async (req, res) => {
    try {
        const { assignmentId } = req.params;
        const assignment = await Assignment.findById(assignmentId).select("createdBy");
        if (!assignment) return res.status(404).json({ message: "Assignment not found." });
        if (assignment.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Access denied." });
        }

        const cached = await redis.get(`paper:${assignmentId}`);
        if (cached) {
            console.log("[Controller] Returning cached paper for:", assignmentId);
            return res.status(200).json({ fromCache: true, paper: JSON.parse(cached) });
        }

        const paper = await GeneratedPaper.findOne({ assignmentId })
            .populate("assignmentId", "title subject dueDate totalMarks");

        if (!paper) {
            return res.status(404).json({ message: "Paper not found. It may still be processing." });
        }

        res.status(200).json({ fromCache: false, paper });
    } catch (err) {
        console.log("[Controller] getGeneratedPaper error:", err.message);
        res.status(500).json({ message: "Internal server error." });
    }
};

// ─── Get All Assignments ──────────────────────────────────────────────────
export const getAllAssignments = async (req, res) => {
    try {
        const assignments = await Assignment.find({ createdBy: req.user._id })
            .select("-fileContent")
            .sort({ createdAt: -1 });
        res.status(200).json({ assignments });
    } catch (err) {
        console.log("[Controller] getAllAssignments error:", err.message);
        res.status(500).json({ message: "Internal server error." });
    }
};

// ─── Regenerate Paper ─────────────────────────────────────────────────────
export const regeneratePaper = async (req, res) => {
    try {
        const { assignmentId } = req.params;
        const assignment = await Assignment.findById(assignmentId);
        if (!assignment) return res.status(404).json({ message: "Assignment not found." });

        await GeneratedPaper.deleteOne({ assignmentId });
        await redis.del(`paper:${assignmentId}`);
        assignment.status = "pending";
        await assignment.save();

        const job = await addGenerationJob(
            assignment._id.toString(),
            buildGenerationJobData(assignment, req.user, {
                fileContent: assignment.fileContent,
            })
        );

        assignment.jobId = job.id;
        await assignment.save();
        res.status(200).json({ message: "Regeneration started.", assignmentId: assignment._id, jobId: job.id });
    } catch (err) {
        console.log("[Controller] regeneratePaper error:", err.message);
        res.status(500).json({ message: "Internal server error." });
    }
};

// ─── Delete Assignment ────────────────────────────────────────────────────
export const deleteAssignment = async (req, res) => {
    try {
        const { assignmentId } = req.params;
        const assignment = await Assignment.findById(assignmentId);
        if (!assignment) return res.status(404).json({ message: "Assignment not found." });
        if (assignment.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Access denied." });
        }

        if (assignment.jobId) {
            try {
                const job = await assignmentQueue.getJob(assignment.jobId);
                if (job) await job.remove();
            } catch (e) {
                console.log("[Controller] Job cleanup skipped:", e.message);
            }
        }

        await Promise.allSettled([
            GeneratedPaper.deleteOne({ assignmentId }),
            redis.del(`paper:${assignmentId}`),
        ]);
        await Assignment.deleteOne({ _id: assignmentId });

        res.status(200).json({ message: "Assignment deleted successfully.", assignmentId });
    } catch (err) {
        console.log("[Controller] deleteAssignment error:", err.message);
        res.status(500).json({ message: "Internal server error." });
    }
};