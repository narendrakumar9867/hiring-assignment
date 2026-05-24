import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        default: "",
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        default: null,
    },
    profilePic: {
        type: String,
        default: "",
    },
    authProvider: {
        type: String,
        enum: ["firebase", "local"],
        default: "firebase",
    },
    firebaseUid: {
        type: String,
        default: null,
    },
    schoolOrCollegeName: {
        type: String,
        default: "",
        trim: true,
    },
    address: {
        type: String,
        default: "",
        trim: true,
    },
}, { timestamps: true });

const User = mongoose.model("User", userSchema);

export default User;