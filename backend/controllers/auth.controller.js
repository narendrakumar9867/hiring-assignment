import User from "../models/user.model.js";
import { getFirebaseAdminAuth } from "../config/firebaseAdmin.js";

const syncFirebaseUser = async (firebaseToken) => {
    const firebaseAuth = getFirebaseAdminAuth();
    const decodedToken = await firebaseAuth.verifyIdToken(firebaseToken);

    if (!decodedToken?.email) {
        throw new Error("No email found in Firebase token.");
    }

    const email = decodedToken.email.toLowerCase().trim();
    const name = decodedToken.name || email.split("@")[0] || "";
    const profilePic = decodedToken.picture || "";

    let user = await User.findOne({ email });

    if (!user) {
        user = new User({
            name,
            email,
            profilePic,
            authProvider: "firebase",
            firebaseUid: decodedToken.uid,
            password: null,
            schoolOrCollegeName: "",
            address: "",
        });
    } else {
        user.name = user.name || name;
        user.email = email;
        user.profilePic = profilePic || user.profilePic;
        user.firebaseUid = decodedToken.uid;
        user.authProvider = "firebase";
        user.password = null;
    }

    await user.save();

    return {
        _id: user._id,
        name: user.name,
        email: user.email,
        profilePic: user.profilePic,
        authProvider: user.authProvider,
        firebaseUid: user.firebaseUid,
        schoolOrCollegeName: user.schoolOrCollegeName,
        address: user.address,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
};

export const signup = async (req, res) => {
    try {
        const firebaseToken = req.body?.idToken || req.body?.token;

        if (!firebaseToken) {
            return res.status(400).json({ message: "Firebase token is required." });
        }

        const user = await syncFirebaseUser(firebaseToken);
        res.status(201).json(user);
    } catch (error) {
        console.log("Error in signup controller:", error.message);
        res.status(500).json({ message: "Internal server error." });
    }
};

export const login = async (req, res) => {
    try {
        const firebaseToken = req.body?.idToken || req.body?.token;

        if (!firebaseToken) {
            return res.status(400).json({ message: "Firebase token is required." });
        }

        const user = await syncFirebaseUser(firebaseToken);
        res.status(200).json(user);
    } catch (error) {
        console.log("Error in login controller:", error.message);
        res.status(500).json({ message: "Internal server error." });
    }
};

export const googleSignupOrLogin = async (req, res) => {
    try {
        const firebaseToken = req.body?.idToken || req.body?.token;

        if (!firebaseToken) {
            return res.status(400).json({ message: "Firebase token is required." });
        }

        const user = await syncFirebaseUser(firebaseToken);
        res.status(200).json(user);
    } catch (error) {
        console.log("Error in googleSignupOrLogin controller:", error.message);
        res.status(500).json({ message: "Internal server error." });
    }
};

export const logout = (req, res) => {
    try {
        res.cookie("jwt", "", { maxAge: 0 });
        res.status(200).json({ message: "Logged out successfully." });
    } catch (error) {
        console.log("Error in logout controller:", error.message);
        res.status(500).json({ message: "Internal server error." });
    }
};

export const checkAuth = (req, res) => {
    try {
        res.status(200).json(req.user);
    } catch (error) {
        console.log("Error in checkAuth controller:", error.message);
        res.status(500).json({ message: "Internal server error." });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const { schoolOrCollegeName, address = "" } = req.body || {};

        if (!schoolOrCollegeName || !schoolOrCollegeName.trim()) {
            return res.status(400).json({ message: "College or school name is required." });
        }

        const user = req.user;
        user.schoolOrCollegeName = schoolOrCollegeName.trim();
        user.address = address.trim();
        await user.save();

        return res.status(200).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            profilePic: user.profilePic,
            authProvider: user.authProvider,
            firebaseUid: user.firebaseUid,
            schoolOrCollegeName: user.schoolOrCollegeName,
            address: user.address,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        });
    } catch (error) {
        console.log("Error in updateProfile controller:", error.message);
        res.status(500).json({ message: "Internal server error." });
    }
};

