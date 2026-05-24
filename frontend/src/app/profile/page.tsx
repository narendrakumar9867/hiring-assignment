"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/services/api";
import { UserProfile } from "@/types";
import { getFirebaseAuth } from "@/lib/firebase";
import { signOut } from "firebase/auth";

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getInitials(name?: string) {
  if (!name) return "U";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profileError, setProfileError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [schoolOrCollegeName, setSchoolOrCollegeName] = useState("");
  const [address, setAddress] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await authApi.checkAuth();
        if (!active) return;
        setUser(data);
        setSchoolOrCollegeName(data.schoolOrCollegeName || "");
        setAddress(data.address || "");
      } catch (err) {
        if (!active) return;
        setError((err as Error).message || "Failed to load profile.");
        setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  const needsProfile = !loading && !(user?.schoolOrCollegeName?.trim());

  const handleSaveProfile = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      setProfileError("");
      const updated = await authApi.updateProfile({
        schoolOrCollegeName,
        address,
      });
      setUser(updated);
      setSchoolOrCollegeName(updated.schoolOrCollegeName || "");
      setAddress(updated.address || "");
    } catch (err) {
      setProfileError((err as Error).message || "Failed to save profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await signOut(getFirebaseAuth());
      await authApi.logout();
      localStorage.removeItem("token");
      router.push("/");
    } catch (err) {
      setError((err as Error).message || "Failed to logout.");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#fffaf4_0%,#f7f4ef_40%,#f1eee8_100%)] text-[#1a1a1a]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-6 lg:px-8 lg:py-8">
        <div className="mb-6 flex items-center justify-between gap-4 rounded-3xl border border-[#e8e6e0] bg-white/85 px-5 py-4 shadow-[0_16px_40px_rgba(0,0,0,0.05)] backdrop-blur">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/assignments"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e8e6e0] text-[#555] transition-colors hover:border-[#1a1a1a] hover:text-[#1a1a1a]"
              aria-label="Back to dashboard"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </Link>
            <div>
              <p className="text-[12px] uppercase tracking-[0.18em] text-[#8c8c8c]">User Profile</p>
              <h1 className="font-display text-[28px] font-bold tracking-tight">My Account</h1>
            </div>
          </div>
          <Link
            href="/dashboard/assignments"
            className="rounded-full border border-[#e8e6e0] bg-[#1a1a1a] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#2d2d2d]"
          >
            Go to dashboard
          </Link>
        </div>

        <div className="grid flex-1 gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-4xl border border-[#e8e6e0] bg-white p-6 shadow-[0_18px_50px_rgba(0,0,0,0.05)] lg:p-8">
            <div className="flex items-start gap-5">
              <div className="min-w-0 flex-1 pt-1">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#fff4ec] px-3 py-1 text-[12px] font-medium text-[#c75b1f]">Active session</span>
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-[#faf9f7] p-4">
                <p className="text-[12px] uppercase tracking-[0.16em] text-[#8c8c8c]">Member since</p>
                <p className="mt-2 text-[16px] font-semibold text-[#1a1a1a]">{formatDate(user?.createdAt)}</p>
              </div>
            </div>

            {error && (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
                {error}
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="rounded-full bg-[#1a1a1a] px-5 py-3 text-[13.5px] font-medium text-white transition-colors hover:bg-[#2d2d2d] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loggingOut ? "Signing out..." : "Sign out"}
              </button>
              <Link
                href="/dashboard/assignments/create"
                className="rounded-full border border-[#e8e6e0] bg-white px-5 py-3 text-[13.5px] font-medium text-[#1a1a1a] transition-colors hover:border-[#1a1a1a]"
              >
                Create assignment
              </Link>
            </div>
          </section>

          <section className="rounded-4xl border border-[#e8e6e0] bg-white p-6 shadow-[0_18px_50px_rgba(0,0,0,0.05)] lg:p-8">
            <div className="mb-6">
              <p className="text-[12px] uppercase tracking-[0.18em] text-[#8c8c8c]">Account details</p>
              <h3 className="mt-2 font-display text-[22px] font-bold tracking-tight">
                {needsProfile ? "Complete your profile" : "User Profile"}
              </h3>
              <p className="mt-2 text-[13px] text-[#7b7b7b]">
                School or college name is required. Address is optional.
              </p>
            </div>

            {loading ? (
              <div className="space-y-4">
                <div className="h-16 rounded-2xl bg-[#f5f4f0]" />
                <div className="h-16 rounded-2xl bg-[#f5f4f0]" />
                <div className="h-16 rounded-2xl bg-[#f5f4f0]" />
              </div>
            ) : (
              <div className="space-y-5">
                <form onSubmit={handleSaveProfile} className="space-y-4 rounded-3xl border border-[#f0ede8] bg-[#faf9f7] p-5">
                  <div>
                    <label htmlFor="schoolOrCollegeName" className="mb-2 block text-[13px] font-medium text-[#1a1a1a]">
                      College or school name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="schoolOrCollegeName"
                      value={schoolOrCollegeName}
                      onChange={(e) => setSchoolOrCollegeName(e.target.value)}
                      required
                      placeholder="Enter college or school name"
                      className="w-full rounded-2xl border border-[#e3dfd8] bg-white px-4 py-3 text-[14px] text-[#1a1a1a] outline-none transition-colors placeholder:text-[#a5a5a5] focus:border-[#1a1a1a]"
                    />
                  </div>

                  <div>
                    <label htmlFor="address" className="mb-2 block text-[13px] font-medium text-[#1a1a1a]">
                      Address <span className="text-[#8c8c8c]">(optional)</span>
                    </label>
                    <textarea
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      rows={4}
                      placeholder="Enter address"
                      className="w-full resize-none rounded-2xl border border-[#e3dfd8] bg-white px-4 py-3 text-[14px] text-[#1a1a1a] outline-none transition-colors placeholder:text-[#a5a5a5] focus:border-[#1a1a1a]"
                    />
                  </div>

                  {profileError && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
                      {profileError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="inline-flex items-center justify-center rounded-full bg-[#1a1a1a] px-5 py-3 text-[13.5px] font-medium text-white transition-colors hover:bg-[#2d2d2d] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingProfile ? "Saving..." : "Save profile"}
                  </button>
                </form>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-[#f0ede8] bg-[#faf9f7] p-4">
                    <p className="text-[12px] text-[#8c8c8c]">Name</p>
                    <p className="mt-1 text-[15px] font-semibold text-[#1a1a1a]">{user?.name || "—"}</p>
                  </div>
                  <div className="rounded-2xl border border-[#f0ede8] bg-[#faf9f7] p-4">
                    <p className="text-[12px] text-[#8c8c8c]">Email</p>
                    <p className="mt-1 text-[15px] font-semibold text-[#1a1a1a]">{user?.email || "—"}</p>
                  </div>
                  <div className="rounded-2xl border border-[#f0ede8] bg-[#faf9f7] p-4">
                    <p className="text-[12px] text-[#8c8c8c]">College / School</p>
                    <p className="mt-1 text-[15px] font-semibold text-[#1a1a1a]">{user?.schoolOrCollegeName || "—"}</p>
                  </div>
                  <div className="rounded-2xl border border-[#f0ede8] bg-[#faf9f7] p-4">
                    <p className="text-[12px] text-[#8c8c8c]">Address</p>
                    <p className="mt-1 text-[15px] font-semibold text-[#1a1a1a]">{user?.address || "—"}</p>
                  </div>
                  <div className="rounded-2xl border border-[#f0ede8] bg-[#faf9f7] p-4">
                    <p className="text-[12px] text-[#8c8c8c]">User ID</p>
                    <p className="mt-1 break-all text-[14px] font-semibold text-[#1a1a1a]">{user?._id || "—"}</p>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

