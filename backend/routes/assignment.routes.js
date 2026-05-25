import express from "express";
import multer from "multer";
import {
    createAssignment,
    deleteAssignment,
    getAssignmentStatus,
    getGeneratedPaper,
    getAllAssignments,
    regeneratePaper,
} from "../controllers/assignment.controller.js";
import { protectRoute } from "../middlewares/auth.middleware.js";

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ["application/pdf", "text/plain"];
        allowed.includes(file.mimetype)
            ? cb(null, true)
            : cb(new Error("Only PDF and .txt files are allowed."));
    },
});

router.get("/", protectRoute, getAllAssignments);
router.post("/create", protectRoute, upload.single("file"), createAssignment);
router.delete("/:assignmentId", protectRoute, deleteAssignment);
router.get("/:assignmentId/status", protectRoute, getAssignmentStatus);
router.get("/:assignmentId/paper", protectRoute, getGeneratedPaper);
router.post("/:assignmentId/regenerate", protectRoute, regeneratePaper);

export default router;
