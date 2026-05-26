import "dotenv/config";
import { Worker } from "bullmq";
import connectDB from "../config/db.js";
import redis, { bullMqRedisConnection } from "../config/redis.js";
import Assignment from "../models/assignment.model.js";
import GeneratedPaper from "../models/generatedPaper.model.js";
import {
  generateQuestionPaper,
  prepareFileContent,
  extractTemplateFields,
} from "../services/ai.service.js";
import dns from "node:dns/promises";

dns.setServers(["1.1.1.1"]);

await connectDB();

const publishUpdate = async (jobId, payload) => {
  try {
    await redis.publish("job-updates", JSON.stringify({ jobId, ...payload }));
  } catch (err) {
    console.error(`[Worker] Failed to publish update for job ${jobId}:`, err.message);
  }
};

const firstValue = (...values) => values.find((value) => value !== undefined && value !== null && String(value).trim()) || "";

const buildAssignmentData = (rawData) => {
  const templateFields = extractTemplateFields(rawData.fileContent || "");

  return {
    title: firstValue(templateFields.paperTitle, rawData.title, rawData.paperTitle, "Question Paper"),
    subject: firstValue(templateFields.subjectName, rawData.subject, rawData.subjectName, "General"),
    topic: firstValue(templateFields.topicsCovered, rawData.topic, rawData.topicsCovered),
    schoolOrCollegeName: firstValue(templateFields.schoolOrCollegeName, rawData.schoolOrCollegeName, rawData.school, rawData.college),
    address: firstValue(rawData.address),
    board: firstValue(templateFields.board, rawData.board, rawData.boardUniversity),
    academicYear: firstValue(templateFields.academicYear, rawData.academicYear),
    classGrade: firstValue(templateFields.classGrade, rawData.classGrade, rawData.class, rawData.grade),
    stream: firstValue(templateFields.stream, rawData.stream),
    medium: firstValue(templateFields.medium, rawData.medium, "English"),
    examType: firstValue(templateFields.examType, rawData.examType),
    timeDuration: firstValue(templateFields.timeDuration, rawData.timeDuration, rawData.timeAllowed, "3 Hours"),
    maximumMarks: firstValue(templateFields.maximumMarks, rawData.maximumMarks, rawData.maxMarks),
    passingMarks: firstValue(templateFields.passingMarks, rawData.passingMarks),
    chapterNames: firstValue(templateFields.chapterNames, rawData.chapterNames, rawData.chapters),
    topicsCovered: firstValue(templateFields.topicsCovered, rawData.topicsCovered, rawData.topics),
    difficulty: firstValue(templateFields.difficulty, rawData.difficulty, "medium"),
    questionTypes: rawData.questionTypes || [],
    internalChoices: templateFields.internalChoices ?? rawData.internalChoices ?? false,
    bloomsTaxonomy: rawData.bloomsTaxonomy || [],
    learningOutcomes: firstValue(templateFields.learningOutcomes, rawData.learningOutcomes),
    examDate: firstValue(rawData.examDate),
    preparedBy: firstValue(rawData.preparedBy),
    reviewedBy: firstValue(rawData.reviewedBy),
    additionalInstructions: firstValue(rawData.additionalInstructions, rawData.instructions, templateFields.additionalNotes),
    additionalNotes: firstValue(templateFields.additionalNotes, rawData.additionalNotes, rawData.notes),
    fileContent: rawData.fileContent
      ? prepareFileContent(rawData.fileContent, 4000)
      : "",
  };
};

const worker = new Worker(
  "assignment-generation",
  async (job) => {
    const { assignmentId, assignmentData: rawData } = job.data;
    console.log(`[Worker] Processing job ${job.id} | assignment: ${assignmentId}`);

    await publishUpdate(job.id, {
      status: "processing",
      message: "Generating your question paper…",
    });

    await Assignment.findByIdAndUpdate(assignmentId, {
      status: "processing",
      jobId: job.id,
    });

    const assignmentData = buildAssignmentData(rawData);

    // Diagnostic logs: show whether fileContent is present and a short preview
    try {
      const fc = assignmentData.fileContent || "";
      console.log(`[Worker][Diag] fileContent length=${fc.length}; preview=${fc.slice(0,300).replace(/\n/g,' ')}${fc.length>300? '...':''}`);
      console.log(`[Worker][Diag] template-derived subject='${assignmentData.subject}' topic='${assignmentData.topic}' class='${assignmentData.classGrade}'`);
    } catch (e) {
      console.warn('[Worker][Diag] failed to log fileContent preview', e?.message || e);
    }

    if (!assignmentData.subject) {
      throw new Error("Missing required field: subject");
    }
    if (!Array.isArray(assignmentData.questionTypes) || assignmentData.questionTypes.length === 0) {
      throw new Error("Missing required field: questionTypes (must be a non-empty array)");
    }

    const generatedData = await generateQuestionPaper(assignmentData);

    const paperPayload = {
      assignmentId,
      schoolOrCollegeName:  assignmentData.schoolOrCollegeName,
      address:              assignmentData.address,
      board:                assignmentData.board,
      academicYear:         assignmentData.academicYear,
      classGrade:           assignmentData.classGrade,
      stream:               assignmentData.stream,
      medium:               assignmentData.medium,
      examType:             assignmentData.examType,
      passingMarks:         assignmentData.passingMarks,
      examDate:             assignmentData.examDate,
      preparedBy:           assignmentData.preparedBy,
      reviewedBy:           assignmentData.reviewedBy,
      ...generatedData,
    };

    const paper = new GeneratedPaper(paperPayload);
    await paper.save();

    await Assignment.findByIdAndUpdate(assignmentId, { status: "completed" });

    await redis.setex(`paper:${assignmentId}`, 86400, JSON.stringify(paperPayload));

    await publishUpdate(job.id, {
      status: "completed",
      message: "Question paper generated successfully!",
      paperId: paper._id.toString(),
      assignmentId,
    });

    console.log(`[Worker] Job ${job.id} completed | paperId: ${paper._id}`);
    return { paperId: paper._id.toString(), assignmentId };
  },
  {
    connection: bullMqRedisConnection,
    concurrency: 5,
  }
);

worker.on("failed", async (job, error) => {
  console.error(`[Worker] Job ${job?.id} failed:`, error.message);

  if (job?.data?.assignmentId) {
    await Assignment.findByIdAndUpdate(job.data.assignmentId, { status: "failed" });
  }

  await publishUpdate(job?.id, {
    status: "failed",
    message: "Paper generation failed. Please try again.",
    error: error.message,
  });
});

console.log("[Worker] Generation worker started — waiting for jobs…");