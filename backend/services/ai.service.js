import "dotenv/config";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "mixtral-8x7b-32768",
];

const VALID_TYPES = new Set([
  "mcq",
  "short_answer",
  "long_answer",
  "true_false",
  "fill_in_blank",
  "case_study",
]);

const VALID_DIFFICULTIES = new Set(["easy", "medium", "hard"]);

const BLOOM_LEVELS = new Set([
  "knowledge",
  "understanding",
  "application",
  "analysis",
  "synthesis",
  "evaluation",
]);

const normalizeType = (value) => {
  const raw = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "_");

  const aliases = {
    shortanswer: "short_answer",
    short_answer: "short_answer",
    short_answers: "short_answer",
    short_question: "short_answer",
    short_questions: "short_answer",
    sa: "short_answer",
    longanswer: "long_answer",
    long_answer: "long_answer",
    long_answers: "long_answer",
    long_question: "long_answer",
    long_questions: "long_answer",
    la: "long_answer",
    truefalse: "true_false",
    true_false: "true_false",
    true_or_false: "true_false",
    tf: "true_false",
    fill_in_blank: "fill_in_blank",
    fill_in_the_blank: "fill_in_blank",
    fill_blanks: "fill_in_blank",
    fib: "fill_in_blank",
    mcq: "mcq",
    multiple_choice: "mcq",
    multiple_choice_question: "mcq",
    case_study: "case_study",
    casestudy: "case_study",
    cs: "case_study",
  };

  return aliases[raw] || (VALID_TYPES.has(raw) ? raw : "mcq");
};

const normalizeDifficulty = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  return VALID_DIFFICULTIES.has(raw) ? raw : "medium";
};

const normalizeBloom = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  return BLOOM_LEVELS.has(raw) ? raw : null;
};

export const normalizeGeneratedPaper = (paper) => {
  if (!paper || !Array.isArray(paper.sections)) return paper;

  let globalQuestionCounter = 1;

  paper.sections = paper.sections.map((section, sectionIdx) => {
    const questions = Array.isArray(section.questions) ? section.questions : [];

    section.questions = questions.map((q) => {
      const type = normalizeType(q.type);
      const options =
        Array.isArray(q.options) ? q.options.filter(Boolean).map(String) : [];

      const normalized = {
        ...q,
        questionNumber: globalQuestionCounter++,
        type,
        difficulty: normalizeDifficulty(q.difficulty),
        marks: Number.isFinite(Number(q.marks)) ? Number(q.marks) : 1,
        options: type === "mcq" ? options.slice(0, 4) : [],
      };

      if (q.bloomLevel) {
        const bl = normalizeBloom(q.bloomLevel);
        if (bl) normalized.bloomLevel = bl;
      }

      return normalized;
    });

    section.sectionTitle =
      section.sectionTitle || `Section ${String.fromCharCode(65 + sectionIdx)}`;
    section.instruction = section.instruction || "Attempt all questions.";
    section.totalMarks = section.questions.reduce(
      (sum, q) => sum + Number(q.marks || 0),
      0
    );

    return section;
  });

  paper.totalMarks = paper.sections.reduce(
    (sum, s) => sum + Number(s.totalMarks || 0),
    0
  );

  if (!Array.isArray(paper.generalInstructions)) paper.generalInstructions = [];
  if (!Array.isArray(paper.answerKey)) paper.answerKey = [];

  return paper;
};

export const prepareFileContent = (raw, maxChars = 4000) => {
  if (!raw) return "";

  let text = raw
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  text = text
    .replace(/Page \d+ of \d+/gi, "")
    .replace(/^\s*\d+\s*$/gm, "")
    .replace(/https?:\/\/\S+/g, "")
    .trim();

  if (text.length <= maxChars) return text;

  const lines = text.split("\n");
  const highValue = [];
  const normal = [];

  const headingRe = /^(chapter|unit|section|\d+\.|\#{1,3})/i;
  const defRe = /\b(definition|means|refers to|is defined as)\b/i;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (headingRe.test(trimmed) || defRe.test(trimmed)) {
      highValue.push(trimmed);
    } else {
      normal.push(trimmed);
    }
  }

  const hvBudget = Math.floor(maxChars * 0.6);
  const normalBudget = maxChars - hvBudget;

  const hvText = highValue.join("\n").slice(0, hvBudget);
  const normalText = normal.join("\n").slice(0, normalBudget);

  return `${hvText}\n\n${normalText}`.trim();
};

export const extractTemplateFields = (raw) => {
  if (!raw || typeof raw !== "string") return {};

  const text = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\t/g, "  ");
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);

  const extractFromLines = (patterns) => {
    for (const line of lines) {
      for (const re of patterns) {
        const match = line.match(re);
        const value = match?.[1]?.trim();
        if (value && !/^(Example|Description|Field\s*Name)/i.test(value)) {
          return value;
        }
      }
    }
    return "";
  };

  const patterns = (label) => {
    const escaped = label.replace(/\//g, "\\/").replace(/\s+/g, "\\s*");
    return [
      new RegExp(`^${escaped}\\s*[:\\-]\\s*(.+)`, "i"),
      new RegExp(`^${escaped}\\s{2,}(.+)`, "i"),
    ];
  };

  const schoolOrCollegeName = extractFromLines([
    ...patterns("School / College Name"),
    ...patterns("School Name"),
    ...patterns("College Name"),
    ...patterns("Institution Name"),
  ]);

  const board = extractFromLines([
    ...patterns("Board / University"),
    ...patterns("Board"),
    ...patterns("University"),
  ]);

  const academicYear = extractFromLines([...patterns("Academic Year")]);

  const classGrade = extractFromLines([
    ...patterns("Class / Grade"),
    ...patterns("Class Grade"),
    ...patterns("Class"),
    ...patterns("Grade"),
  ]);

  const stream = extractFromLines([...patterns("Stream")]);

  const subjectName = extractFromLines([...patterns("Subject Name"), ...patterns("Subject")]);

  const examType = extractFromLines([
    ...patterns("Exam Type"),
    ...patterns("Examination Type"),
  ]);

  const paperTitle = extractFromLines([...patterns("Paper Title")]);

  const timeDuration = extractFromLines([
    ...patterns("Time Duration"),
    ...patterns("Time Allowed"),
    ...patterns("Duration"),
  ]);

  const maximumMarks = extractFromLines([
    ...patterns("Maximum Marks"),
    ...patterns("Max Marks"),
    ...patterns("Total Marks"),
  ]);

  const passingMarks = extractFromLines([
    ...patterns("Passing Marks"),
    ...patterns("Pass Marks"),
  ]);

  const medium = extractFromLines([...patterns("Medium")]);

  const chapterNames = extractFromLines([
    ...patterns("Chapter Names"),
    ...patterns("Chapters"),
  ]);

  const topicsCovered = extractFromLines([
    ...patterns("Topics Covered"),
    ...patterns("Topics"),
  ]);

  const difficultyRaw = extractFromLines([
    ...patterns("Difficulty Level"),
    ...patterns("Difficulty"),
  ]);
  const diffMap = { easy: "easy", medium: "medium", hard: "hard", mixed: "mixed" };
  const difficulty = diffMap[difficultyRaw.toLowerCase()] || "";

  const questionTypes = extractFromLines([...patterns("Question Types")]);

  const internalChoicesRaw = extractFromLines([
    ...patterns("Internal Choices"),
    ...patterns("Internal Choice"),
  ]);
  const internalChoices = /yes/i.test(internalChoicesRaw);

  const learningOutcomes = extractFromLines([
    ...patterns("Learning Outcomes"),
    ...patterns("Learning Outcome"),
  ]);

  const examDate = extractFromLines([...patterns("Exam Date")]);

  const preparedBy = extractFromLines([...patterns("Prepared By")]);

  const reviewedBy = extractFromLines([...patterns("Reviewed By")]);

  let additionalNotes = "";
  const notesIdx = lines.findIndex((line) => /^Additional\s*Notes/i.test(line));
  if (notesIdx !== -1) {
    additionalNotes = lines
      .slice(notesIdx + 1)
      .map((line) => line.replace(/^[•\-*]\s*/, "").trim())
      .filter(Boolean)
      .join(" ");
  }

  const result = {
    schoolOrCollegeName,
    board,
    academicYear,
    classGrade,
    stream,
    subjectName,
    examType,
    paperTitle,
    timeDuration,
    maximumMarks,
    passingMarks,
    medium,
    chapterNames,
    topicsCovered,
    difficulty,
    questionTypes,
    internalChoices,
    learningOutcomes,
    examDate,
    preparedBy,
    reviewedBy,
    additionalNotes,
  };

  console.log("[extractTemplateFields] Parsed:", JSON.stringify(result, null, 2));
  return result;
};

/**
 * Build a compact content outline from extracted PDF text.
 * This helps the model stay grounded in the uploaded document.
 */
export const extractContentOutline = (raw) => {
  if (!raw || typeof raw !== "string") return "";

  const cleaned = prepareFileContent(raw, 5000);
  if (!cleaned) return "";

  const lines = cleaned
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const headingLike = [];
  const numberedLike = [];
  const keywordCounts = new Map();

  const stopWords = new Set([
    "the",
    "and",
    "for",
    "with",
    "from",
    "that",
    "this",
    "into",
    "are",
    "was",
    "were",
    "you",
    "your",
    "our",
    "their",
    "has",
    "have",
    "had",
    "will",
    "shall",
    "can",
    "could",
    "should",
    "would",
    "about",
    "when",
    "where",
    "what",
    "which",
    "who",
    "whom",
    "why",
    "how",
    "page",
    "chapter",
    "section",
    "unit",
    "lesson",
    "topic",
    "subject",
  ]);

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (/^(chapter|unit|section|lesson|topic|exercise|question|part|\d+\.)/i.test(line)) {
      if (headingLike.length < 20) headingLike.push(line);
    }
    if (/^\d+[.)]/.test(line) || /^[-*•]/.test(line)) {
      if (numberedLike.length < 25) numberedLike.push(line);
    }

    const words = line
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3 && !stopWords.has(word));

    for (const word of words) {
      keywordCounts.set(word, (keywordCounts.get(word) || 0) + 1);
    }
  }

  const keywords = [...keywordCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([word, count]) => `${word} (${count})`);

  const outlineParts = [];
  if (headingLike.length) outlineParts.push(`HEADINGS:\n${headingLike.join("\n")}`);
  if (numberedLike.length) outlineParts.push(`LIST ITEMS:\n${numberedLike.join("\n")}`);
  if (keywords.length) outlineParts.push(`TOP KEYWORDS:\n${keywords.join(", ")}`);

  return outlineParts.join("\n\n").trim();
};

// ─── Prompt builder ───────────────────────────────────────────────────────
const buildPrompt = (assignmentData) => {
  const {
    // Paper identity
    title,
    subject,
    topic,
    // School info
    schoolOrCollegeName,
    address,
    board,
    // Academic context
    academicYear,
    classGrade,
    stream,
    medium,
    // Exam metadata
    examType,
    timeDuration,
    maximumMarks,
    passingMarks,
    // Content scope
    chapterNames,
    topicsCovered,
    difficulty,
    questionTypes, // [{ type, count, marksPerQuestion }]
    internalChoices,
    bloomsTaxonomy,
    learningOutcomes,
    // Paper logistics
    examDate,
    preparedBy,
    reviewedBy,
    additionalInstructions,
    additionalNotes,
    // Extracted file/PDF text
    fileContent,
  } = assignmentData;

  const templateFields = extractTemplateFields(fileContent || "");

  // Determine if uploaded file contains substantive content
  const cleanedFileContent = fileContent ? prepareFileContent(fileContent, 5000) : "";
  const contentOutline = fileContent ? extractContentOutline(fileContent) : "";

  // ── Sections description ──────────────────────────────────────────────
  const sectionsDesc = questionTypes
    .map((qt, idx) => {
      const letter = String.fromCharCode(65 + idx);
      const typeName = qt.type.replace(/_/g, " ").toUpperCase();
      const total = qt.count * qt.marksPerQuestion;
      return `Section ${letter}: ${qt.count} × ${typeName} | ${qt.marksPerQuestion} mark(s) each | Section total = ${total} marks`;
    })
    .join("\n");

  // ── Context from uploaded file ────────────────────────────────────────
  const contextBlock = fileContent
    ? `\n\n=== REFERENCE MATERIAL ===\n${cleanedFileContent}\n\n=== CONTENT OUTLINE ===\n${contentOutline || "(none)"}\n\n=== EXTRACTED TEMPLATE FIELDS ===\n${JSON.stringify(
        templateFields,
        null,
        2
      )}\n=== END REFERENCE MATERIAL ===`
    : "";

  // ── Board/class specific style hints ─────────────────────────────────
  const boardHint = board
    ? `Follow the official ${board} question paper format and terminology strictly.`
    : "";

  // ── Bloom's taxonomy guidance ─────────────────────────────────────────
  const bloomHint =
    bloomsTaxonomy && bloomsTaxonomy.length
      ? `Apply these Bloom's Taxonomy levels across questions: ${
          Array.isArray(bloomsTaxonomy)
            ? bloomsTaxonomy.join(", ")
            : bloomsTaxonomy
        }.`
      : "Balance Knowledge (30%), Understanding (40%), and Application (30%) questions.";

  // ── Difficulty distribution ───────────────────────────────────────────
  const diffHints = {
    easy: "70% easy, 20% medium, 10% hard",
    medium: "20% easy, 60% medium, 20% hard",
    hard: "10% easy, 30% medium, 60% hard",
  };
  const diffDistribution = diffHints[difficulty] || diffHints.medium;
  const sourceMode = fileContent ? "CONTENT_BASED" : "NO_UPLOAD";

  // ── Internal choices guidance ─────────────────────────────────────────
  const choiceHint =
    internalChoices === true || internalChoices === "yes"
      ? 'For long_answer and case_study questions add an "OR" alternative question in the "alternateQuestion" field.'
      : "";

  return `You are a senior academic paper-setter with 20+ years of experience creating board/university examination papers.
Your task: generate a complete, accurate, curriculum-aligned question paper as a single valid JSON object.

════════════════ PAPER METADATA ════════════════
School/College : ${schoolOrCollegeName || "N/A"}
Address        : ${address || "N/A"}
Board/University: ${board || "N/A"}
Academic Year  : ${academicYear || "N/A"}
Class/Grade    : ${classGrade || "N/A"}
Stream         : ${stream || "N/A"}
Medium         : ${medium || "English"}
Subject        : ${templateFields.subjectName || subject}
Topic/Chapter  : ${topic || templateFields.chapterNames || chapterNames || subject}
Exam Type      : ${examType || "Examination"}
Paper Title    : ${title}
Duration       : ${timeDuration || "3 Hours"}
Maximum Marks  : ${maximumMarks || "N/A"}
Passing Marks  : ${passingMarks || "N/A"}
Exam Date      : ${examDate || "N/A"}
Prepared By    : ${preparedBy || "N/A"}
Reviewed By    : ${reviewedBy || "N/A"}
Difficulty     : ${templateFields.difficulty || difficulty}
Internal Choice: ${internalChoices ? "Yes" : "No"}
Source Mode    : ${sourceMode}
════════════════ SECTIONS TO GENERATE ════════════════
${sectionsDesc}
════════════════ CONTENT SCOPE ════════════════
Chapters  : ${templateFields.chapterNames || chapterNames || topic || subject}
Topics    : ${templateFields.topicsCovered || topicsCovered || topic || subject}
Learning Outcomes: ${templateFields.learningOutcomes || learningOutcomes || "As per curriculum"}
${boardHint}
${bloomHint}
Difficulty distribution per section: ${diffDistribution}
${choiceHint}
Additional Instructions: ${additionalInstructions || "None"}
Additional Notes: ${templateFields.additionalNotes || additionalNotes || "None"}
${contextBlock}

════════════════ OUTPUT RULES ════════════════
1. Return ONLY a valid JSON object. No markdown, no explanation, no text before/after.
2. Every question MUST relate directly to: ${topic || chapterNames || subject} in ${subject}.
3. MCQ: exactly 4 options (A-D). All other types: "options": [].
4. "difficulty" per question: "easy" | "medium" | "hard" only.
5. "type" values: "mcq" | "short_answer" | "long_answer" | "true_false" | "fill_in_blank" | "case_study".
6. answerKey: one entry per question, in paper order. MCQ answer = the full correct option text.
7. generalInstructions: 4-6 realistic exam hall instructions relevant to this exam type and board.
8. IMPORTANT: If Source Mode is CONTENT_BASED, then USE ONLY the uploaded reference material and the CONTENT OUTLINE for deriving question content, choices, and answers. Do NOT introduce external facts, examples, or generic GK. If Source Mode is METADATA_ONLY, infer metadata (subject, chapters, topics) from it and generate a curriculum-appropriate paper using standard subject knowledge.
9. When file content is present, treat it as the primary source of truth. Ignore any user-supplied subject/topic if they conflict with the uploaded content.
10. sectionTitle must match exactly: "Section A", "Section B", etc.
11. questionNumber must be globally sequential (1, 2, 3… across all sections).
12. "totalMarks" at paper level must equal the sum of all section marks.
13. Include "bloomLevel" field per question: "knowledge"|"understanding"|"application"|"analysis"|"synthesis"|"evaluation".

════════════════ REQUIRED JSON STRUCTURE ════════════════
{
  "title": "${title}",
  "subject": "${subject}",
  "classGrade": "${classGrade || ""}",
  "board": "${board || ""}",
  "examType": "${examType || ""}",
  "academicYear": "${academicYear || ""}",
  "timeDuration": "${timeDuration || "3 Hours"}",
  "totalMarks": <number — must match sum of all sections>,
  "passingMarks": ${passingMarks ? `"${passingMarks}"` : "null"},
  "medium": "${medium || "English"}",
  "generalInstructions": [
    "All questions are compulsory.",
    "Read each question carefully before answering.",
    "...3-4 more relevant instructions..."
  ],
  "sections": [
    {
      "sectionTitle": "Section A",
      "instruction": "Attempt all questions. Each question carries 1 mark.",
      "totalMarks": <number>,
      "questions": [
        {
          "questionNumber": 1,
          "questionText": "Complete, unambiguous question text relevant to ${subject}",
          "type": "mcq",
          "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
          "difficulty": "easy",
          "marks": 1,
          "bloomLevel": "knowledge"
        }
      ]
    }
  ],
  "answerKey": [
    {
      "questionNumber": 1,
      "answer": "Full correct answer text (for MCQ: the full correct option text, not just A/B/C/D)"
    }
  ],
  "preparedBy": "${preparedBy || ""}",
  "reviewedBy": "${reviewedBy || ""}",
  "examDate": "${examDate || ""}"
}`;
};

// ─── Retry helper ─────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Main export ──────────────────────────────────────────────────────────
export const generateQuestionPaper = async (assignmentData) => {
  const prompt = buildPrompt(assignmentData);

  // Diagnostic: log prompt size and a truncated preview
  try {
    console.log(`[AI][Diag] Prompt length=${String(prompt).length}. Preview:\n${String(prompt).slice(0,1000)}`);
  } catch (e) {
    console.warn('[AI][Diag] Failed to log prompt preview', e?.message || e);
  }

  let responseText = "";
  let lastError = null;

  // Try each model with one retry on transient failures
  for (const modelName of GROQ_MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await client.chat.completions.create({
          model: modelName,
          temperature: 0.5, // Lower = more deterministic / less hallucination
          max_tokens: 4096,
          messages: [
            {
              role: "system",
              content:
                "You are an expert academic paper-setter. You output ONLY valid JSON with no markdown fences, no commentary, and no text outside the JSON object.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        });

        responseText =
          response.choices?.[0]?.message?.content?.trim() || "";
        // Diagnostic: log raw response preview
        try {
          console.log(`[AI][Diag] Raw response (truncated): ${String(responseText).slice(0,1000)}`);
        } catch (e) {
          console.warn('[AI][Diag] Failed to log raw response', e?.message || e);
        }
        if (responseText) break;
      } catch (err) {
        lastError = err;
        const msg = err?.message || "";
        console.warn(
          `[AI] Model ${modelName} attempt ${attempt} failed: ${msg}`
        );
        // Don't retry quota/auth errors
        if (
          msg.includes("429") ||
          msg.includes("401") ||
          msg.includes("Quota")
        )
          break;
        if (attempt < 2) await sleep(1500);
      }
    }
    if (responseText) break;
  }

  // ── Error escalation ────────────────────────────────────────────────
  if (!responseText) {
    const msg = lastError?.message || "Groq returned an empty response.";
    if (msg.includes("Quota") || msg.includes("429")) {
      throw new Error(
        `Groq quota exceeded. Please check your usage/billing. Original: ${msg}`
      );
    }
    throw new Error(
      `All Groq models failed to generate content. Original: ${msg}`
    );
  }

  // ── Strip markdown fences if model added them despite instructions ──
  responseText = responseText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // ── Parse & validate ────────────────────────────────────────────────
  let parsed;
  try {
    parsed = JSON.parse(responseText);
  } catch (parseErr) {
    // Attempt to salvage by extracting the first {...} block
    const match = responseText.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        throw new Error(
          `AI response was not valid JSON. Raw response (first 500 chars): ${responseText.slice(
            0,
            500
          )}`
        );
      }
    } else {
      throw new Error(
        `AI response was not valid JSON. Raw response (first 500 chars): ${responseText.slice(
          0,
          500
        )}`
      );
    }
  }

  const normalized = normalizeGeneratedPaper(parsed);

  if (
    !normalized.sections ||
    !Array.isArray(normalized.sections) ||
    normalized.sections.length === 0
  ) {
    throw new Error("Invalid AI response: missing or empty sections array.");
  }

  // Sanity-check: at least one question in the paper
  const totalQ = normalized.sections.reduce(
    (sum, s) => sum + (s.questions?.length || 0),
    0
  );
  if (totalQ === 0) {
    throw new Error("Invalid AI response: paper contains zero questions.");
  }

  return normalized;
};