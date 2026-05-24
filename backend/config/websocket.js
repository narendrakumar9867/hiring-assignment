import { WebSocketServer } from "ws";
import { redisSubscriber } from "./redis.js";

let wss;
const clients = new Map();

export const initWebSocket = (server) => {
    wss = new WebSocketServer({ server });

    wss.on("connection", (ws) => {
        console.log("WebSocket client connected");

        ws.on("message", (message) => {
            try {
                const data = JSON.parse(message.toString());
                // Frontend sends { type: "subscribe", jobId: "..." }
                if (data.type === "subscribe" && data.jobId) {
                    clients.set(data.jobId, ws);
                    console.log(`Client subscribed to job: ${data.jobId}`);
                }
            } catch (err) {
                console.log("WebSocket message parse error:", err.message);
            }
        });

        ws.on("close", () => {
            for (const [jobId, client] of clients.entries()) {
                if (client === ws) clients.delete(jobId);
            }
            console.log("WebSocket client disconnected");
        });

        ws.on("error", (err) => console.log("WebSocket error:", err.message));
    });

    // Subscribe to Redis pub/sub channel
    // Worker publishes here → server forwards to connected WS client
    redisSubscriber.subscribe("job-updates", (err) => {
        if (err) console.error("Redis subscribe error:", err.message);
        else console.log("Subscribed to Redis 'job-updates' channel");
    });

    redisSubscriber.on("message", (channel, message) => {
        if (channel === "job-updates") {
            try {
                const data = JSON.parse(message);
                const client = clients.get(data.jobId);
                if (client && client.readyState === 1) {
                    client.send(JSON.stringify(data));
                    console.log(`WebSocket update sent for job: ${data.jobId}`);
                }
            } catch (err) {
                console.log("Redis message parse error:", err.message);
            }
        }
    });

    console.log("WebSocket server initialized");
    return wss;
};

export { wss };

