import express from "express";
import {
    checkAuth,
    logout,
    signup as firebaseAuthSync,
    updateProfile,
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/firebase", firebaseAuthSync);
router.post("/logout", logout);
router.get("/check", protectRoute, checkAuth);
router.put("/profile", protectRoute, updateProfile);

export default router;
