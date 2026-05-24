export interface QuestionTypePayload {
  type: "mcq" | "short_answer" | "long_answer" | "true_false" | "fill_in_blank";
  count: number;
  marksPerQuestion: number;
}

export interface Assignment {
  _id: string;
  title: string;
  subject: string;
  topic?: string;
  dueDate: string;
  difficulty: "easy" | "medium" | "hard" | "mixed";
  questionTypes: QuestionTypePayload[];
  totalMarks: number;
  additionalInstructions?: string;
  fileName?: string | null;
  status: "pending" | "processing" | "completed" | "failed";
  jobId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Question {
  questionNumber: number;
  questionText: string;
  type: QuestionTypePayload["type"];
  options: string[];
  difficulty: "easy" | "medium" | "hard";
  marks: number;
}

export interface Section {
  sectionTitle: string;
  instruction: string;
  questions: Question[];
  totalMarks: number;
}

export interface AnswerKeyItem {
  questionNumber: number;
  answer: string;
}

export interface GeneratedPaper {
  _id: string;
  assignmentId: string;
  title: string;
  subject: string;
  schoolOrCollegeName?: string;
  address?: string;
  totalMarks: number;
  duration?: string;
  generalInstructions: string[];
  answerKey?: AnswerKeyItem[];
  sections: Section[];
  createdAt: string;
}

export interface UserProfile {
  _id: string;
  name: string;
  email: string;
  profilePic?: string;
  authProvider?: "local" | "firebase";
  firebaseUid?: string | null;
  schoolOrCollegeName?: string;
  address?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface JobUpdate {
  jobId: string;
  status: "processing" | "completed" | "failed";
  message: string;
  paperId?: string;
  assignmentId?: string;
  error?: string;
}