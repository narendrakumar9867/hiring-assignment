import { Assignment, GeneratedPaper, UserProfile } from "@/types";

const BASE_URL = process.env.API_URL;

// Token cookie se ya localStorage se lo
function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data as T;
}

export const authApi = {
  firebaseAuth: (idToken: string) =>
    request<UserProfile>("/auth/firebase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }),

  checkAuth: () =>
    request<UserProfile>("/auth/check"),

  updateProfile: (payload: { schoolOrCollegeName: string; address?: string }) =>
    request<UserProfile>("/auth/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  logout: () =>
    request("/auth/logout", { method: "POST" }),
};

export const assignmentApi = {
  getAll: () =>
    request<{ assignments: Assignment[] }>("/assignments"),

  getStatus: (id: string) =>
    request<{ assignmentId: string; status: string; jobId: string }>(`/assignments/${id}/status`),

  create: (formData: FormData) =>
    request<{ assignmentId: string; jobId: string; totalMarks: number; status: string }>(
      "/assignments/create",
      { method: "POST", body: formData }
    ),

  regenerate: (id: string) =>
    request<{ assignmentId: string; jobId: string }>(`/assignments/${id}/regenerate`, {
      method: "POST",
    }),

  getPaper: (assignmentId: string) =>
    request<{ paper: GeneratedPaper; fromCache: boolean }>(`/assignments/${assignmentId}/paper`),
};