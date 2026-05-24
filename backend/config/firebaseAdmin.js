import admin from "firebase-admin";

let firebaseApp;

export const initFirebaseAdmin = () => {
    if (admin.apps.length > 0) {
        firebaseApp = admin.apps[0];
        return;
    }

    const serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
    };

    firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });

    console.log("Firebase Admin initialized");
};

export const getFirebaseAdminAuth = () => {
    if (!firebaseApp) {
        throw new Error("Firebase Admin not initialized. Call initFirebaseAdmin() first.");
    }
    return admin.auth();
};
