import { Queue } from "bullmq";
import redis from "../config/redis.js";

const assignmentQueue = new Queue("assignment-generation", {
    connection: redis,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
    },
});

export const addGenerationJob = async (assignmentId, assignmentData) => {
    const job = await assignmentQueue.add(
        "generate-paper",
        { assignmentId, assignmentData }
    );
    console.log(`Job added to queue: ${job.id}`);
    return job;
};

export default assignmentQueue;
