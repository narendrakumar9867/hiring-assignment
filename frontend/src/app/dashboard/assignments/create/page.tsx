"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import VoiceNoteInput from "@/components/VoiceNoteInput";
import { assignmentApi } from "@/services/api";
import { useWebSocket } from "@/hooks/useWebSocket";
import { JobUpdate } from "@/types";

interface QTypeRow {
  id: string;
  type: string;
  count: number;
  marksPerQuestion: number;
}

const Q_TYPE_OPTIONS = [
  { value: "mcq",             label: "Multiple Choice Questions" },
  { value: "short_answer",    label: "Short Questions" },
  { value: "long_answer",     label: "Long Answer Questions" },
  { value: "true_false",      label: "True / False" },
  { value: "fill_in_blank",   label: "Fill in the Blank" },
  { value: "diagram",         label: "Diagram/Graph-Based Questions" },
  { value: "numerical",       label: "Numerical Problems" },
];

export default function CreateAssignmentPage() {
  const router = useRouter();

  const [dueDate, setDueDate] = useState("");
  const [additionalInfo,setAdditionalInfo] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [qTypes,setQTypes] = useState<QTypeRow[]>([
    { id: "1", type: "mcq",          count: 4, marksPerQuestion: 1 },
    { id: "2", type: "short_answer", count: 3, marksPerQuestion: 2 },
  ]);

  const totalQuestions = qTypes.reduce((s, q) => s + q.count, 0);
  const totalMarks = qTypes.reduce((s, q) => s + q.count * q.marksPerQuestion, 0);

  const [submitting, setSubmitting] = useState(false);
  const [jobId,setJobId] = useState<string | null>(null);
  const [assignmentId, setAssignmentId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [errors,setErrors] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  useWebSocket(jobId, (update: JobUpdate) => {
    setStatusMsg(update.message);
    if (update.status === "completed" && update.assignmentId) {
      setSubmitting(false);
      router.push(`/dashboard/assignments/${update.assignmentId}/paper?autoprint=1`);
    }
    if (update.status === "failed") {
      setSubmitting(false);
      setJobId(null);
    }
  });

  useEffect(() => {
    if (!submitting || !assignmentId) return;

    const intervalId = setInterval(async () => {
      try {
        const statusRes = await assignmentApi.getStatus(assignmentId);
        if (statusRes.status === "completed") {
          setSubmitting(false);
          setJobId(null);
          router.push(`/dashboard/assignments/${assignmentId}/paper?autoprint=1`);
          return;
        }
        if (statusRes.status === "failed") {
          setSubmitting(false);
          setJobId(null);
          setStatusMsg("Generation failed. Please try again.");
        }
      } catch {
      }
    }, 2500);

    return () => clearInterval(intervalId);
  }, [submitting, assignmentId, router]);

  const updateQType = (id: string, field: keyof QTypeRow, val: string | number) =>
    setQTypes((prev) => prev.map((q) => (q.id === id ? { ...q, [field]: val } : q)));

  const changeCount = (id: string, delta: number) => {
    const q = qTypes.find((x) => x.id === id)!;
    const next = Math.max(1, q.count + delta);
    updateQType(id, "count", next);
  };

  const changeMarks = (id: string, delta: number) => {
    const q = qTypes.find((x) => x.id === id)!;
    const next = Math.max(1, q.marksPerQuestion + delta);
    updateQType(id, "marksPerQuestion", next);
  };

  const addQType = () =>
    setQTypes((prev) => [
      ...prev,
      { id: Date.now().toString(), type: "long_answer", count: 5, marksPerQuestion: 5 },
    ]);

  const removeQType = (id: string) => {
    if (qTypes.length === 1) return;
    setQTypes((prev) => prev.filter((q) => q.id !== id));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.type === "application/pdf" || f.type === "text/plain")) {
      setFile(f);
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!dueDate) e.dueDate = "Due date is required";
    else if (new Date(dueDate) < new Date()) e.dueDate = "Due date must be in the future";
    qTypes.forEach((q, i) => {
      if (q.count < 1)            e[`count_${i}`] = "Min 1";
      if (q.marksPerQuestion < 1) e[`marks_${i}`] = "Min 1";
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setStatusMsg("Submitting...");

    const fd = new FormData();
    fd.append("title",                  file?.name?.replace(/\.[^.]+$/, "") || "Assignment");
    fd.append("subject",                "General");
    fd.append("dueDate",                dueDate);
    fd.append("difficulty",             "mixed");
    fd.append("additionalInstructions", additionalInfo);
    fd.append("questionTypes",          JSON.stringify(
      qTypes.map(({ type, count, marksPerQuestion }) => ({ type, count, marksPerQuestion }))
    ));
    if (file) fd.append("file", file);

    try {
      const res = await assignmentApi.create(fd);
      setAssignmentId(res.assignmentId);
      setJobId(res.jobId);
      setStatusMsg("Generating your question paper...");
    } catch (err) {
      setStatusMsg((err as Error).message);
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f5f4f0]">
      <Navbar title="Assignment" showBack={true} />

      <div className="flex flex-col gap-0 mb-3 pt-10 items-start pl-17.5">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 blur-xs" />
          <h1 className="font-display text-[18px] font-bold text-[#1a1a1a] tracking-tight">
            Create Assignment
          </h1>
        </div>
        <p className="text-[12.5px] text-[#5E5E5E8C] ml-4">
          Set up a new assignment for your students
        </p>
      </div>

      <main className="flex-1 flex justify-center px-6 py-6">
        <div className="w-6xl flex flex-col gap-0">

          <div className="w-full h-1 bg-[#e8e6e0] rounded-full mb-6">
            <div className="h-1 bg-[#1a1a1a] rounded-full w-1/2" />
          </div>

          <div className="bg-white rounded-2xl border border-[#e8e6e0] p-6 flex flex-col gap-6">
            <div>
              <h2 className="font-display text-[16px] font-bold text-[#1a1a1a]">Assignment Details</h2>
              <p className="text-[12.5px] text-[#6b6b6b] mt-0.5">Basic information about your assignment</p>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-2 py-8 px-4 rounded-2xl border-2 border-dashed cursor-pointer transition-colors ${
                dragOver
                  ? "border-[#1a1a1a] bg-[#f5f4f0]"
                  : "border-[#d0cdc8] bg-[#fafaf9] hover:border-[#a0a0a0]"
              }`}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6b6b6b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              {file ? (
                <p className="text-[13px] font-medium text-[#1a1a1a]">{file.name}</p>
              ) : (
                <>
                  <p className="text-[13.5px] font-medium text-black">Choose a file or drag & drop it here</p>
                  <p className="text-[12px] text-[#a0a0a0]">JPEG, PNG, upto 10MB</p>
                  <button
                    type="button"
                    className="mt-1 px-4 py-1.5 rounded-lg border border-[#e8e6e0] text-[12.5px] font-medium text-black hover:bg-[#F6F6F6] transition-colors"
                  >
                    Browse Files
                  </button>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <p className="text-[12px] text-[#a0a0a0] -mt-4 text-center">
              Upload images of your preferred document/image
            </p>

            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-[1fr_36px_160px_160px] gap-3 px-1 items-center">
                <span className="text-[13px] font-semibold text-[#2c2c2c]">Question Type</span>
                <span className="text-[12px] font-semibold text-[#6b6b6b] text-center"> </span>
                <span className="text-[13px] font-semibold text-[#2c2c2c] text-center">No. of Questions</span>
                <span className="text-[13px] font-semibold text-[#2c2c2c] text-center">Marks</span>
              </div>

              {qTypes.map((q, i) => (
                <div key={q.id} className="grid grid-cols-[1fr_36px_160px_160px] gap-3 items-center">
                  <div className="relative">
                    <div className="bg-white rounded-full px-4 py-3 shadow-sm flex items-center justify-between">
                      <select
                        value={q.type}
                        onChange={(e) => updateQType(q.id, "type", e.target.value)}
                        className="w-full appearance-none bg-transparent border-0 text-[14px] text-[#1a1a1a] pr-8"
                      >
                        {Q_TYPE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                      <svg className="ml-2 text-[#a0a0a0]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>

                  <div className="flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => removeQType(q.id)}
                      disabled={qTypes.length === 1}
                      className="text-[#9a9a9a] hover:text-red-500 disabled:opacity-20"
                      aria-label="Remove question type"
                    >
                      ×
                    </button>
                  </div>

                  <div className="flex items-center justify-center">
                    <div className="bg-white rounded-full px-3 py-2 shadow-sm flex items-center gap-3">
                      <button type="button" onClick={() => changeCount(q.id, -1)} className="w-7 h-7 rounded-full flex items-center justify-center text-[#6b6b6b] hover:text-[#1a1a1a] transition-colors">−</button>
                      <span className="w-6 text-center text-[14px] font-medium text-[#1a1a1a]">{q.count}</span>
                      <button type="button" onClick={() => changeCount(q.id, +1)} className="w-7 h-7 rounded-full flex items-center justify-center text-[#6b6b6b] hover:text-[#1a1a1a] transition-colors">+</button>
                    </div>
                  </div>

                  <div className="flex items-center justify-center">
                    <div className="bg-white rounded-full px-3 py-2 shadow-sm flex items-center gap-3">
                      <button type="button" onClick={() => changeMarks(q.id, -1)} className="w-7 h-7 rounded-full flex items-center justify-center text-[#6b6b6b] hover:text-[#1a1a1a] transition-colors">−</button>
                      <span className="w-6 text-center text-[14px] font-medium text-[#1a1a1a]">{q.marksPerQuestion}</span>
                      <button type="button" onClick={() => changeMarks(q.id, +1)} className="w-7 h-7 rounded-full flex items-center justify-center text-[#6b6b6b] hover:text-[#1a1a1a] transition-colors">+</button>
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addQType}
                className="flex items-center gap-2 px-1 py-1 text-[13px] hover:text-[#1a1a1a] transition-colors w-fit text-sm font-semibold text-black"
              >
                <div className="w-8 h-8 rounded-full bg-[#2B2B2B] flex items-center justify-center shrink-0">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </div>
                Add Question Type
              </button>

              <div className="flex flex-col items-end gap-0.5 pt-2">
                <p className="text-sm text-black">
                  Total Questions : <span className="font-semibold text-[#1a1a1a]">{totalQuestions}</span>
                </p>
                <p className="text-sm text-black">
                  Total Marks : <span className="font-semibold text-[#1a1a1a]">{totalMarks}</span>
                </p>
              </div>
            </div>

            <VoiceNoteInput
              label="Additional Information"
              value={additionalInfo}
              onChange={setAdditionalInfo}
            />
          </div>

          {submitting && statusMsg && (
            <div className="flex items-center gap-3 mt-4 px-5 py-3.5 bg-blue-50 border border-blue-200 rounded-xl">
              <svg className="animate-spin shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              <p className="text-[13px] text-blue-700">{statusMsg}</p>
            </div>
          )}

          <div className="flex items-center justify-between mt-6 pb-8">
            <button
              type="button"
              onClick={() => router.back()}
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-3 rounded-full border border-[#e8e6e0] bg-white text-[13.5px] font-normal text-black hover:border-[#1a1a1a] hover:text-[#1a1a1a] disabled:opacity-50 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Previous
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 bg-[#1a1a1a] text-white rounded-full px-8 py-3 text-[13.5px] font-medium shadow-md hover:bg-[#2d2d2d] hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all duration-200"
            >
              {submitting ? "Generating..." : "Next"}
              {!submitting && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
