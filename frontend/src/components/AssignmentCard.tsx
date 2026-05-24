"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Assignment } from "@/types";
import { assignmentApi } from "@/services/api";
import { useAssignmentStore } from "@/store/assignmentStore";

const STATUS_COLORS: Record<Assignment["status"], string> = {
  pending:    "bg-yellow-100 text-yellow-700",
  processing: "bg-blue-100 text-blue-700",
  completed:  "bg-green-100 text-green-700",
  failed:     "bg-red-100 text-red-700",
};

export default function AssignmentCard({ assignment }: { assignment: Assignment }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { fetchAssignments } = useAssignmentStore();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });

  const handleView = () => {
    router.push(`/dashboard/assignments/${assignment._id}/paper`);
    setMenuOpen(false);
  };

  const handleDelete = async () => {
    setMenuOpen(false);
    alert("Delete coming soon");
  };

  return (
    <div className="bg-white rounded-2xl p-5 flex flex-col gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 relative">

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-[18px] font-bold text-[#1a1a1a] tracking-tight truncate">
            {assignment.title}
          </h3>
        </div>

        <div ref={menuRef} className="relative flex-shrink-0">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#a0a0a0] hover:bg-[#f5f4f0] hover:text-[#1a1a1a] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-8 w-[160px] bg-white rounded-xl border border-[#e8e6e0] shadow-lg z-50 overflow-hidden">
              <button
                onClick={handleView}
                className="w-full text-left px-4 py-2.5 text-[13px] text-[#1a1a1a] hover:bg-[#f5f4f0] transition-colors"
              >
                View Assignment
              </button>
              <button
                onClick={handleDelete}
                className="w-full text-left px-4 py-2.5 text-[13px] text-red-500 hover:bg-red-50 transition-colors"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-12">
        <p className="text-[12px] text-black">
          <span className="font-semibold">Assigned on</span> : {formatDate(assignment.createdAt)}
        </p>
        <p className="text-[12px] text-black">
          <span className="font-semibold">Due</span> : {formatDate(assignment.dueDate)}
        </p>
      </div>
    </div>
  );
}