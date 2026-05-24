import User from "../models/user.model.js";
import { getFirebaseAdminAuth } from "../config/firebaseAdmin.js";

export const protectRoute = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.startsWith("Bearer ")
            ? authHeader.split(" ")[1]
            : req.cookies?.jwt;

        if (!token) {
            return res.status(401).json({ message: "Unauthorized — no Firebase token provided." });
        }

        const firebaseAuth = getFirebaseAdminAuth();
        const decoded = await firebaseAuth.verifyIdToken(token);

        if (!decoded?.email) {
            return res.status(401).json({ message: "Unauthorized — invalid Firebase token." });
        }

        const email = decoded.email.toLowerCase().trim();
        const profilePic = decoded.picture || "";
        const name = decoded.name || decoded.email.split("@")[0] || "";

        let user = await User.findOne({ email });
        if (!user) {
            user = await User.create({
                name,
                email,
                profilePic,
                authProvider: "firebase",
                firebaseUid: decoded.uid,
                password: null,
            });
        } else {
            user.name = user.name || name;
            user.profilePic = profilePic || user.profilePic;
            user.firebaseUid = decoded.uid;
            user.authProvider = "firebase";
            user.password = null;
            await user.save();
        }

        if (!user) {
            return res.status(401).json({ message: "Unauthorized — user not found." });
        }

        req.user = user;
        next();
    } catch (error) {
        console.log("Error in protectRoute middleware:", error.message);
        res.status(401).json({ message: "Unauthorized — Firebase token expired or invalid." });
    }
};
