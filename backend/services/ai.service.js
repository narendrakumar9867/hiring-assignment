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

const VALID_TYPES = new Set(["mcq", "short_answer", "long_answer", "true_false", "fill_in_blank"]);
const VALID_DIFFICULTIES = new Set(["easy", "medium", "hard"]);

const normalizeType = (value) => {
  const raw = String(value || "").trim().toLowerCase().replace(/[-\s]+/g, "_");
  const aliases = {
    shortanswer: "short_answer",
    short_answer: "short_answer",
    short_answers: "short_answer",
    short_question: "short_answer",
    short_questions: "short_answer",
    longanswer: "long_answer",
    long_answer: "long_answer",
    long_answers: "long_answer",
    long_question: "long_answer",
    long_questions: "long_answer",
    truefalse: "true_false",
    true_false: "true_false",
    true_or_false: "true_false",
    fill_in_blank: "fill_in_blank",
    fill_in_the_blank: "fill_in_blank",
    fill_blanks: "fill_in_blank",
    mcq: "mcq",
  };
  return aliases[raw] || raw;
};

const normalizeDifficulty = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (VALID_DIFFICULTIES.has(raw)) return raw;
  return "medium";
};

const normalizeGeneratedPaper = (paper) => {
  if (!paper || !Array.isArray(paper.sections)) return paper;

  paper.sections = paper.sections.map((section, sectionIdx) => {
    const questions = Array.isArray(section.questions) ? section.questions : [];

    section.questions = questions.map((q, qIdx) => {
      const type = normalizeType(q.type);
      const safeType = VALID_TYPES.has(type) ? type : "mcq";
      const options = Array.isArray(q.options) ? q.options.filter(Boolean).map(String) : [];

      return {
        ...q,
        questionNumber: Number.isFinite(Number(q.questionNumber)) ? Number(q.questionNumber) : qIdx + 1,
        type: safeType,
        difficulty: normalizeDifficulty(q.difficulty),
        marks: Number.isFinite(Number(q.marks)) ? Number(q.marks) : 1,
        options: safeType === "mcq" ? options.slice(0, 4) : [],
      };
    });

    section.sectionTitle = section.sectionTitle || `Section ${String.fromCharCode(65 + sectionIdx)}`;
    section.instruction = section.instruction || "Attempt all questions";
    section.totalMarks = section.questions.reduce((sum, q) => sum + Number(q.marks || 0), 0);

    return section;
  });

  paper.totalMarks = paper.sections.reduce((sum, s) => sum + Number(s.totalMarks || 0), 0);
  if (!Array.isArray(paper.generalInstructions)) {
    paper.generalInstructions = [];
  }
  if (!Array.isArray(paper.answerKey)) {
    paper.answerKey = [];
  }

  return paper;
};

const buildPrompt = (assignmentData) => {
  const { title, subject, topic, questionTypes, difficulty, additionalInstructions, fileContent, schoolOrCollegeName, address } = assignmentData;

    const sectionsDesc = questionTypes.map((qt, index) => {
        const letter = String.fromCharCode(65 + index);
        return `Section ${letter}: ${qt.count} ${qt.type.replace(/_/g, " ")} question(s), ${qt.marksPerQuestion} mark(s) each`;
    }).join("\n");

    const contextText = fileContent
        ? `\n\nReference Material (use this as context for questions):\n${fileContent.substring(0, 2000)}`
        : "";

    return `You are an expert teacher. Generate a structured question paper in valid JSON only.

Assignment:
- Title: ${title}
- Subject: ${subject}
- School/College: ${schoolOrCollegeName || "Not provided"}
- Address: ${address || "Not provided"}
- Topic: ${topic || subject}
- Difficulty: ${difficulty}
- Instructions: ${additionalInstructions || "None"}
${contextText}

Sections to generate:
${sectionsDesc}

Return ONLY valid JSON with this exact structure (no markdown, no explanation, no extra text):
{
  "title": "${title}",
  "subject": "${subject}",
  "totalMarks": <number>,
  "duration": "<e.g. 2 hours>",
  "generalInstructions": ["instruction1", "instruction2", "instruction3"],
  "sections": [
    {
      "sectionTitle": "Section A",
      "instruction": "Attempt all questions",
      "totalMarks": <number>,
      "questions": [
        {
          "questionNumber": 1,
          "questionText": "Full question text here",
          "type": "mcq",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "difficulty": "easy",
          "marks": 2
        }
      ]
    }
  ],
  "answerKey": [
    {
      "questionNumber": 1,
      "answer": "Concise correct answer or the correct MCQ option"
    }
  ]
}

Rules:
- MCQ questions MUST have exactly 4 options. All other types: empty options array [].
- difficulty per question: "easy", "medium", or "hard" only.
- Match difficulty distribution to overall: ${difficulty}
- generalInstructions: 3–5 real exam instructions
- answerKey: include a concise correct answer for every generated question, in the same order as the paper
- If the school/college name or address is relevant for the paper header, keep it consistent with the assignment context
- Return ONLY the JSON object. Nothing else.`;
};

export const generateQuestionPaper = async (assignmentData) => {
    try {
        const prompt = buildPrompt(assignmentData);

    let responseText = "";
    let lastError = null;

    for (const modelName of GROQ_MODELS) {
      try {
        const response = await client.chat.completions.create({
          model: modelName,
          temperature: 0.7,
          max_tokens: 4096,
          messages: [
            {
              role: "system",
              content: "You are an expert teacher that returns only valid JSON.",
            },
            { role: "user", content: `${prompt}\n\nReturn only valid JSON.` },
          ],
        });

        responseText = response.choices?.[0]?.message?.content?.trim() || "";
        if (responseText) break;
      } catch (error) {
        lastError = error;
        const errorMessage = error?.message || "Unknown Groq error";
        console.warn(`Groq model ${modelName} failed: ${errorMessage}`);
      }
    }

    if (!responseText) {
      const msg = lastError?.message || "Groq returned an empty response.";
      if (msg.includes("Quota") || msg.includes("429")) {
        throw new Error(`Groq quota exceeded. Please check usage/billing and retry. Original: ${msg}`);
      }
      throw new Error(`No supported Groq model generated content for this key/project. Original: ${msg}`);
    }

    responseText = responseText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

        const parsed = normalizeGeneratedPaper(JSON.parse(responseText));

        if (!parsed.sections || !Array.isArray(parsed.sections) || parsed.sections.length === 0) {
            throw new Error("Invalid AI response: missing sections array");
        }

        return parsed;
    } catch (error) {
        console.error("AI generation error:", error.message);
        throw error;
    }
};
