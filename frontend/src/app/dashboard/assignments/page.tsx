"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import AssignmentCard from "@/components/AssignmentCard";
import { useAssignmentStore } from "@/store/assignmentStore";

export default function AssignmentsPage() {
  const { assignments, loading, error, fetchAssignments } = useAssignmentStore();
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);


  const filteredAssignments = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return assignments;

    return assignments.filter((assignment) =>
      [assignment.title, assignment.subject, assignment.status]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [assignments, search]);

  const isEmpty = !loading && filteredAssignments.length === 0;

  return (
    <div className="flex min-h-screen flex-col bg-[#f5f4f0]">
      <Navbar title="Assignment" showBack={true} />

      <main className="flex flex-1 items-center justify-center p-8">
        {loading ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6b6b6b" strokeWidth="2" strokeLinecap="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <p className="text-sm text-[#6b6b6b]">Loading assignments...</p>
          </div>
        ) : error ? (
          <div className="max-w-md text-center">
            <p className="mb-4 text-[15px] text-red-500">{error}</p>
            <button
              onClick={fetchAssignments}
              className="rounded-full bg-[#1a1a1a] px-6 py-2.5 text-[13px] font-medium text-white"
            >
              Retry
            </button>
          </div>
        ) : isEmpty ? (
          <div className="flex w-full justify-center" style={{ maxWidth: 560 }}>
            <div className="flex w-full flex-col items-center px-8 pb-8 pt-3 text-center">
              <div className="relative mb-7 h-56 w-56">
                <div className="absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#efefef]" />

                <div className="absolute left-1/2 top-9 z-10 w-24 -translate-x-1/2 rounded-2xl border border-[#e6e3de] bg-[#f9f9f9] px-3 py-4 shadow-sm">
                  <div className="flex flex-col gap-3">
                    <div className="h-2 w-3/5 rounded-full bg-[#011a2d]" />
                    <div className="h-2 w-4/5 rounded-full bg-[#c9c7c3]" />
                    <div className="h-2 w-4/5 rounded-full bg-[#c9c7c3]" />
                    <div className="h-2 w-3/4 rounded-full bg-[#c9c7c3]" />
                    <div className="h-2 w-2/3 rounded-full bg-[#d8d6d2] blur-[1px]" />
                  </div>
                </div>

                <div className="absolute bottom-8 z-20" style={{ left: 102 }}>
                  <div className="flex h-32 w-32 items-center justify-center rounded-full border-8 border-[#b7b0c4] bg-[#f5f5f6]/95 shadow-sm">
                    <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
                      <path d="M8 8l8 8M16 8l-8 8" stroke="#ff4848" strokeWidth="4" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="absolute -bottom-8.5 right-1.5 h-16 w-5 origin-top rotate-[-43deg] rounded-full bg-[#c6c0d5]" />
                </div>

                <svg className="absolute bottom-10.5 left-8.5 z-30" width="20" height="20" viewBox="0 0 16 16" fill="none">
                  <path d="M8 0L9.5 6.5L16 8L9.5 9.5L8 16L6.5 9.5L0 8L6.5 6.5L8 0Z" fill="#3f81b3" opacity="0.9" />
                </svg>

                <svg className="absolute right-5.5 top-6.5 z-30" width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M8 0L9.5 6.5L16 8L9.5 9.5L8 16L6.5 9.5L0 8L6.5 6.5L8 0Z" fill="#bdb7ca" opacity="0.8" />
                </svg>

                <div className="absolute right-4.5 top-34 z-30 h-3 w-3 rounded-full bg-[#4a86b0]" />
                <div className="absolute right-16 top-8 z-30 h-4 w-4 rounded-md border border-[#d8d8d8] bg-[#f7f7f7]" />

                <svg className="absolute left-2.5 top-5 z-40" width="88" height="68" viewBox="0 0 88 68" fill="none">
                  <path d="M3 56C18 50 35 40 45 25C49 19 48 11 37 9C30 8 24 14 26 20C28 26 36 25 44 24" stroke="#0e2539" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </div>

              <h2 className="mb-3 text-3xl font-semibold tracking-[-0.03em] text-[#2f2f2f] md:text-2xl">
                No assignments yet
              </h2>
              <p className="mb-8 text-[20px] leading-[1.45] text-[#777777] md:text-sm" style={{ maxWidth: 540 }}>
                Create your first assignment to start collecting and grading student submissions. You can set up rubrics, define marking criteria, and let AI assist with grading.
              </p>

              <Link
                href="/dashboard/assignments/create"
                className="inline-flex items-center gap-2 rounded-full border border-[#3f3f3f] bg-[#111111] px-7 py-3 text-[14px] font-medium text-white shadow-sm transition-colors hover:bg-[#202020]"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Create Your First Assignment
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex w-full flex-col gap-5 self-start" style={{ maxWidth: 1180 }}>
  
            <div className="flex flex-col gap-0 items-start pl-[10px]">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 blur-xs" />
                <h1 className="font-display text-[18px] font-bold text-[#1a1a1a] tracking-tight">
                  Assignments
                </h1>
              </div>
              <p className="text-[12.5px] text-[#5E5E5E8C] ml-4">
                Manage and create assignments for your classes
              </p>
            </div>

            <div className="flex items-center justify-between gap-4 w-full">

              <label className="sr-only" htmlFor="assignment-search">Search assignment</label>
              <div className="flex items-center gap-2 rounded-full border border-[#e0ddd6] bg-white px-4 py-2.5" style={{ width: 340 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9a9a9a" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.5-3.5" />
                </svg>
                <input
                  id="assignment-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search Assignment"
                  className="w-full bg-transparent text-[13px] text-[#1a1a1a] outline-none placeholder:text-[#a0a0a0]"
                />
              </div>

            </div>

            <div className="grid grid-cols-2 gap-4">
              {filteredAssignments.map((assignment) => (
                <AssignmentCard key={assignment._id} assignment={assignment} />
              ))}
            </div>

            <div className="fixed bottom-6 left-1/2 -translate-x-0 flex flex-col items-center gap-0">
              
              <div className="absolute -inset-x-16 -top-8 h-20 bg-gradient-to-t from-[#f5f4f0] to-transparent blur-sm pointer-events-none" />
              
              <Link
                href="/dashboard/assignments/create"
                className="relative inline-flex items-center gap-2 rounded-full border border-[#3f3f3f] bg-[#111111] px-7 py-3 text-[14px] font-medium text-white shadow-sm transition-colors hover:bg-[#202020]"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Create Assignment
              </Link>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}