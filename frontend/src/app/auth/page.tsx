"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createUserWithEmailAndPassword,
  getIdToken,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { authApi } from "@/services/api";
import { getFirebaseAuth, getGoogleProvider } from "@/lib/firebase";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    authApi.checkAuth()
      .then(() => router.replace("/dashboard/assignments"))
      .catch(() => localStorage.removeItem("token"));
  }, [router]);

  const persistAndSync = async () => {
    const firebaseAuth = getFirebaseAuth();
    const currentUser = firebaseAuth.currentUser;
    if (!currentUser) throw new Error("Firebase user missing.");

    const idToken = await getIdToken(currentUser, true);
    localStorage.setItem("token", idToken);
    await authApi.firebaseAuth(idToken);
    router.push("/dashboard/assignments");
  };

  const handleEmailAuth = async () => {
    setLoading(true);
    setMessage("");

    try {
      if (mode === "signup") {
        const firebaseAuth = getFirebaseAuth();
        const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
        if (name.trim()) {
          await updateProfile(credential.user, { displayName: name.trim() });
        }
      } else {
        const firebaseAuth = getFirebaseAuth();
        await signInWithEmailAndPassword(firebaseAuth, email, password);
      }

      await persistAndSync();
    } catch (error) {
      setMessage((error as Error).message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setMessage("");

    try {
      const firebaseAuth = getFirebaseAuth();
      const googleProvider = getGoogleProvider();
      await signInWithPopup(firebaseAuth, googleProvider);
      await persistAndSync();
    } catch (error) {
      setMessage((error as Error).message || "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#fff7ef_0%,#f4f1eb_42%,#ece8e2_100%)] px-6 py-8 text-[#1a1a1a]">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="flex flex-col justify-between rounded-[36px] border border-[#e8e6e0] bg-[linear-gradient(180deg,#2f2f2f_0%,#232323_100%)] p-8 text-white shadow-[0_24px_70px_rgba(0,0,0,0.14)] lg:p-10">
          <div className="max-w-xl">
            <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[13px] text-white/80">
              <span className="h-2 w-2 rounded-full bg-[#ff9d57]" />
              Incubated at IIM Bangalore
            </div>
            <h1 className="font-display text-[44px] font-bold leading-[1.02] tracking-tight sm:text-[56px]">
              AI Academic Assessment & Intelligence System
            </h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-7 text-white/70">
              An AI academic system for assessment, teaching, and personalised learning - designed to improve academic outcomes, reduce cost & time, and strengthen institutional credibility.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              ["Privacy First", "Student data is strictly protected and never sold."],
              ["End-to-End Encryption", "256-bit encryption in transit and at rest."],
              ["No Student Data in AI Training", "Our AI does not store or learn from student information."],
            ].map(([title, desc]) => (
              <div key={title} className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-[14px] font-semibold text-white">{title}</p>
                <p className="mt-2 text-[13px] leading-6 text-white/65">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center rounded-[36px] border border-[#e8e6e0] bg-white p-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)] lg:p-10">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <p className="text-[12px] uppercase tracking-[0.18em] text-[#8c8c8c]">Authentication</p>
              <h2 className="mt-2 font-display text-[30px] font-bold tracking-tight">{mode === "login" ? "Welcome back" : "Create your account"}</h2>
              <p className="mt-2 text-[14px] text-[#6b6b6b]">Create or access your account.</p>
            </div>

            <div className="space-y-4">
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full rounded-2xl border border-[#e8e6e0] bg-white px-4 py-3.5 text-[14px] font-medium text-[#1a1a1a] transition-colors hover:border-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Continue with Google
              </button>
            </div>

            {message && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
                {message}
              </div>
            )}

            <div className="mt-6 flex items-center justify-between text-[13px] text-[#6b6b6b]">
              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
                className="font-medium text-black"
              >
                {mode === "login" ? "Create a new account" : "Already have an account? Sign in"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}