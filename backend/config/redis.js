import { Redis } from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
const bullMqRedis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
	maxRetriesPerRequest: null,
});

// Separate client for subscribing (can't share with pub)
export const redisSubscriber = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
export const bullMqRedisConnection = bullMqRedis;

redis.on("connect", () => console.log("Redis (main) connected"));
redis.on("error", (err) => console.log("Redis error:", err.message));

redisSubscriber.on("connect", () => console.log("Redis (subscriber) connected"));
redisSubscriber.on("error", (err) => console.log("Redis subscriber error:", err.message));

export default redis;