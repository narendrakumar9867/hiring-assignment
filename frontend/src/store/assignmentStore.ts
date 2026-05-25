"use client";

import { create } from "zustand";
import { Assignment, GeneratedPaper } from "@/types";
import { assignmentApi } from "@/services/api";

interface AssignmentStore {
  assignments: Assignment[];
  loading: boolean;
  error: string | null;
  fetchAssignments: () => Promise<void>;
  addAssignment: (a: Assignment) => void;
  removeAssignment: (id: string) => void;
  updateStatus: (id: string, status: Assignment["status"]) => void;
}

export const useAssignmentStore = create<AssignmentStore>((set) => ({
  assignments: [],
  loading: false,
  error: null,

  fetchAssignments: async () => {
    set({ loading: true, error: null });
    try {
      const data = await assignmentApi.getAll();
      set({ assignments: data.assignments, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  addAssignment: (a) =>
    set((s) => ({ assignments: [a as Assignment, ...s.assignments] })),

  removeAssignment: (id) =>
    set((s) => ({
      assignments: s.assignments.filter((assignment) => assignment._id !== id),
    })),

  updateStatus: (id, status) =>
    set((s) => ({
      assignments: s.assignments.map((a) =>
        a._id === id ? { ...a, status } : a
      ),
    })),
}));