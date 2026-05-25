import express from "express";
import "dotenv/config";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import { initWebSocket } from "./config/websocket.js";
import { initFirebaseAdmin } from "./config/firebaseAdmin.js";
import assignmentRoutes from "./routes/assignment.routes.js";
import authRoutes from "./routes/auth.routes.js";
import dns from "node:dns/promises";
dns.setServers(["1.1.1.1"]);

const app = express();
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

initWebSocket(server);
initFirebaseAdmin();

await connectDB();

app.use(cors({
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/assignments", assignmentRoutes);

app.use("/health", (req, res) => {
    res.status(200).json({ 
        status: "ok", 
        timestamp: new Date().toISOString()
    })
})


server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
