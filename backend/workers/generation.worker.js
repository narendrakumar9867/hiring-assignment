import "dotenv/config";
import { Worker } from "bullmq";
import connectDB from "../config/db.js";
import redis, { bullMqRedisConnection } from "../config/redis.js";
import Assignment from "../models/assignment.model.js";
import GeneratedPaper from "../models/generatedPaper.model.js";
import { generateQuestionPaper } from "../services/ai.service.js";
import dns from "node:dns/promises";
dns.setServers(["1.1.1.1"]);

await connectDB();

// Publish updates via Redis pub/sub → main server forwards to WebSocket
const publishUpdate = async (jobId, payload) => {
    await redis.publish("job-updates", JSON.stringify({ jobId, ...payload }));
};

const worker = new Worker(
    "assignment-generation",
    async (job) => {
        const { assignmentId, assignmentData } = job.data;
        console.log(`Processing job ${job.id} for assignment: ${assignmentId}`);

        // Notify: processing started
        await publishUpdate(job.id, {
            status: "processing",
            message: "Generating your question paper...",
        });

        await Assignment.findByIdAndUpdate(assignmentId, {
            status: "processing",
            jobId: job.id,
        });

        // Call AI
        const generatedData = await generateQuestionPaper(assignmentData);
        const paperPayload = {
            assignmentId,
            schoolOrCollegeName: assignmentData.schoolOrCollegeName || "",
            address: assignmentData.address || "",
            ...generatedData,
        };

        // Save to MongoDB
        const paper = new GeneratedPaper(paperPayload);
        await paper.save();

        // Update assignment status
        await Assignment.findByIdAndUpdate(assignmentId, { status: "completed" });

        // Cache result in Redis for 24 hours
        await redis.setex(`paper:${assignmentId}`, 86400, JSON.stringify(paperPayload));

        // Notify: completed
        await publishUpdate(job.id, {
            status: "completed",
            message: "Question paper generated successfully!",
            paperId: paper._id.toString(),
            assignmentId,
        });

        console.log(`Job ${job.id} completed`);
        return { paperId: paper._id.toString(), assignmentId };
    },
    {
        connection: bullMqRedisConnection,
        concurrency: 5,
    }
);

worker.on("failed", async (job, error) => {
    console.error(`Job ${job.id} failed:`, error.message);

    if (job?.data?.assignmentId) {
        await Assignment.findByIdAndUpdate(job.data.assignmentId, { status: "failed" });
    }

    await publishUpdate(job.id, {
        status: "failed",
        message: "Generation failed. Please try again.",
        error: error.message,
    });
});

console.log("Generation worker started, waiting for jobs...");
