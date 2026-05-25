"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { assignmentApi } from "@/services/api";
import { AnswerKeyItem, GeneratedPaper, Question } from "@/types";

const DIFF_BADGE: Record<string, string> = {
  easy:   "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  hard:   "bg-red-100 text-red-700",
};

export default function PaperPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();
  const searchParams = useSearchParams();
  const autoPrint = searchParams.get("autoprint") === "1";

  const [paper,   setPaper]   = useState<GeneratedPaper | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const hasAutoPrintedRef = useRef(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await assignmentApi.getPaper(id);
        setPaper(res.paper);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  useEffect(() => {
    if (!autoPrint || loading || !paper || hasAutoPrintedRef.current) return;

    hasAutoPrintedRef.current = true;
    window.setTimeout(() => {
      window.print();
    }, 150);
  }, [autoPrint, loading, paper]);

  const handleRegenerate = async () => {
    try {
      setLoading(true);
      await assignmentApi.regenerate(id);
      router.push(`/dashboard/assignments/${id}/paper`);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  // ── Loading ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#f5f4f0]">
        <Navbar title="Create New" showBack={true} />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <svg className="animate-spin" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6b6b6b" strokeWidth="2" strokeLinecap="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <p className="text-[14px] text-[#6b6b6b]">Loading your question paper...</p>
          </div>
        </main>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────
  if (error || !paper) {
    return (
      <div className="flex flex-col min-h-screen bg-[#f5f4f0]">
        <Navbar title="Create New" showBack={true} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-[15px] text-red-500 mb-4">{error || "Paper not found"}</p>
            <button
              onClick={() => router.back()}
              className="px-6 py-2.5 rounded-full bg-[#1a1a1a] text-white text-[13px] font-medium"
            >
              Go Back
            </button>
          </div>
        </main>
      </div>
    );
  }

  const paperData = paper as GeneratedPaper;
  const schoolName = paperData.schoolOrCollegeName || "School Name";
  const schoolAddress = paperData.address?.trim() || "";
  const answerKey = paperData.answerKey ?? [];

  return (
    <div className="flex flex-col min-h-screen bg-[#f5f4f0]">
      <Navbar title="Create New" showBack={true} />

      <main className="flex-1 flex flex-col px-6 py-5 gap-5">

        <div className="bg-[#1a1a1a] text-white rounded-2xl px-6 py-4 flex items-start justify-between gap-4">
          <p className="text-[13.5px] leading-relaxed flex-1">
            Certainly! Here are customized Question Paper for your{" "}
            <span className="font-semibold">{paperData.subject}</span> classes on the NCERT chapters:
          </p>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 shrink-0 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-[12.5px] font-medium transition-colors print:hidden"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download as PDF
          </button>
        </div>

        <div id="print-area" ref={printRef} className="bg-white rounded-2xl border border-[#e8e6e0] overflow-hidden">

          <div className="px-10 py-8 max-w-190 mx-auto">

            <div className="print-page">
              <div className="text-center mb-6 border-b-2 border-[#1a1a1a] pb-6">
              <h1 className="text-[20px] font-bold text-[#1a1a1a] leading-tight">
                {schoolAddress ? `${schoolName}, ${schoolAddress}` : schoolName}
              </h1>
              <p className="text-[14px] text-[#1a1a1a] mt-1">
                Subject: {paper.subject} &nbsp;|&nbsp; Class: {paperData.class || "5th"}
              </p>
            </div>

            <div className="flex items-center justify-between mb-5">
              <p className="text-[13px] text-[#1a1a1a]">
                Time Allowed: {paperData.duration || "2 hours"}
              </p>
              <p className="text-[13px] text-[#1a1a1a]">
                Maximum Marks: {paperData.totalMarks}
              </p>
            </div>

            {paperData.generalInstructions?.length > 0 && (
              <div className="mb-5">
                {paperData.generalInstructions.map((inst, i) => (
                  <p key={i} className="text-[12.5px] text-[#1a1a1a] leading-relaxed">{inst}</p>
                ))}
              </div>
            )}

            <div className="mb-7 flex flex-col gap-1.5">
              <p className="text-[12.5px] text-[#1a1a1a]">Name: _______________</p>
              <p className="text-[12.5px] text-[#1a1a1a]">Roll Number: _______________</p>
              <p className="text-[12.5px] text-[#1a1a1a]">Class: 5th Section: _______</p>
            </div>

            {paperData.sections.map((section, si) => (
              <div key={si} className="mb-8 avoid-break">
                <h2 className="text-[16px] font-bold text-[#1a1a1a] text-center mb-2">
                  {section.sectionTitle}
                </h2>

                {section.questions[0] && (
                  <div className="mb-3">
                    <p className="text-[13px] font-semibold text-[#1a1a1a]">
                      {section.questions[0].type === "short_answer"   ? "Short Answer Questions" :
                       section.questions[0].type === "long_answer"    ? "Long Answer Questions"  :
                       section.questions[0].type === "mcq"            ? "Multiple Choice Questions" :
                       section.questions[0].type === "true_false"     ? "True or False"          :
                       "Questions"}
                    </p>
                    <p className="text-[12px] text-[#6b6b6b] italic">{section.instruction}</p>
                  </div>
                )}

                <ol className="flex flex-col gap-4">
                  {section.questions.map((q: Question, qi: number) => (
                    <li key={qi} className="flex gap-3 avoid-break">
                      <span className="text-[13px] text-[#1a1a1a] shrink-0 font-medium pt-0.5">
                        {q.questionNumber}.
                      </span>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-[13px] text-[#1a1a1a] leading-relaxed flex-1">
                            {q.questionText}
                          </p>
                          <span className="text-[12px] text-[#6b6b6b] shrink-0 pt-0.5">
                            [{q.marks} Marks]
                          </span>
                        </div>

                        {q.type === "mcq" && q.options?.length > 0 && (
                          <div className="grid grid-cols-2 gap-1 mt-2">
                            {q.options.map((opt, oi) => (
                              <p key={oi} className="text-[12.5px] text-[#1a1a1a]">
                                {String.fromCharCode(65 + oi)}) {opt}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>

                <p className="text-[12px] text-[#6b6b6b] mt-4 font-medium">
                  End of {section.sectionTitle}
                </p>
              </div>
            ))}

            </div>

            {answerKey.length > 0 && (
              <div className="print-page mt-10 border-t-2 border-[#1a1a1a] pt-6">
                <h2 className="text-[16px] font-bold text-[#1a1a1a] mb-4">Answer Key</h2>
                <ol className="flex flex-col gap-3">
                  {answerKey.map((item: AnswerKeyItem) => (
                    <li key={item.questionNumber} className="text-[13px] text-[#1a1a1a] leading-relaxed avoid-break">
                      <span className="font-semibold">{item.questionNumber}.</span> {item.answer}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
      </main>

      <style jsx global>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          html, body { width: 210mm; height: 297mm; }
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; max-width: none; box-shadow: none; border-radius: 0; }
          .print\:hidden { display: none !important; }

          /* Make each .print-page behave like a real page */
          .print-page { display: block; page-break-after: always; break-after: page; }

          /* Avoid splitting individual questions or sections across pages when possible */
          .avoid-break { break-inside: avoid; page-break-inside: avoid; -webkit-column-break-inside: avoid; }

          /* Use full page width for printed content */
          .px-10 { padding-left: 12mm !important; padding-right: 12mm !important; }
          .py-8 { padding-top: 12mm !important; padding-bottom: 12mm !important; }
        }
      `}</style>
    </div>
  );
}
