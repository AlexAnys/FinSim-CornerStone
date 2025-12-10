
import { GoogleGenAI, Type, Chat } from "@google/genai";
import { Message, SimulationConfig, GradeResult, StudentSubmission, AnalysisReport } from "../types";

const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Starts a chat session representing the Client Persona.
 */
export const createSimulationChat = (config: SimulationConfig): Chat => {
  const ai = getAIClient();
  
  // Construct a robust system instruction for the AI to stay in character
  const systemInstruction = `
    You are roleplaying as a financial planning client in a simulation for students.
    
    YOUR CHARACTER:
    ${config.scenario}

    CONTEXT:
    You are talking to a student who is acting as a Financial Manager.
    
    INSTRUCTIONS:
    1. Adopt the persona described in "YOUR CHARACTER" completely. Use the tone, vocabulary, and financial situation described.
    2. Do NOT act as an AI. Act as the human client.
    3. The conversation starts with you saying: "${config.openingLine}" (This has already been sent, do not repeat it immediately).
    4. Provide information only when asked, or if it flows naturally in conversation. Do not dump all info at once.
    5. Be consistent with your financial data (income, debts, goals).
    6. If the student gives bad advice based on your profile, you can express doubt or confusion.
    7. Keep responses concise (under 3-4 sentences) like a real chat, unless explaining a complex life situation.
    8. **IMPORTANT: ALWAYS SPEAK IN CHINESE (Simplified Chinese).**
  `;

  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: systemInstruction,
      temperature: 0.9, // Slightly creative to be natural
    },
  });
};

/**
 * Evaluates the transcript based on the Rubric.
 */
export const evaluateSession = async (
  config: SimulationConfig,
  messages: Message[]
): Promise<GradeResult> => {
  const ai = getAIClient();

  const transcript = messages
    .map((m) => `${m.role === 'user' ? 'Student (Financial Manager)' : 'Client (AI)'}: ${m.text}`)
    .join('\n');

  const rubricDescription = config.rubric
    .map((r, index) => `Criterion ${index + 1} (ID: ${r.id}, Max Points: ${r.points}): ${r.description}`)
    .join('\n');

  const prompt = `
    You are an expert evaluator in a financial planning education system.
    
    ROLE SETTING:
    ${config.evaluatorPersona}

    TASK:
    Evaluate the following transcript between a Student (Financial Manager) and a Client.
    
    TRANSCRIPT:
    ${transcript}

    GRADING STANDARDS:
    Strictness Level: ${config.strictness}
    
    RUBRIC:
    ${rubricDescription}

    OUTPUT:
    Provide the output in JSON format containing the score for each criterion and overall feedback.
    **All feedback and comments MUST be in Simplified Chinese.**
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          totalScore: { type: Type.NUMBER },
          feedback: { type: Type.STRING, description: "Overall feedback in Chinese" },
          breakdown: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                criterionId: { type: Type.STRING },
                score: { type: Type.NUMBER },
                comment: { type: Type.STRING, description: "Specific comment in Chinese" },
              },
              required: ["criterionId", "score", "comment"],
            },
          },
        },
        required: ["totalScore", "feedback", "breakdown"],
      },
    },
  });

  if (!response.text) {
    throw new Error("Failed to generate evaluation.");
  }

  const result = JSON.parse(response.text);
  
  // Calculate max possible score from config to ensure data integrity
  const maxScore = config.rubric.reduce((acc, curr) => acc + curr.points, 0);

  return {
    ...result,
    maxScore,
  };
};

/**
 * Generates an intelligent analysis of class performance returning structured JSON.
 */
export const generateClassAnalysis = async (submissions: StudentSubmission[]): Promise<AnalysisReport> => {
  if (submissions.length === 0) {
    throw new Error("No submissions to analyze");
  }

  const ai = getAIClient();

  // Condense data to avoid token limits
  const dataSummary = submissions.map(sub => ({
    student: sub.studentName,
    task: sub.taskName,
    score: sub.grade.totalScore,
    maxScore: sub.grade.maxScore,
    weaknesses: sub.grade.breakdown.filter(b => b.score < (15 * 0.6)).map(b => b.comment), // Approximate heuristic
    feedback: sub.grade.feedback
  }));

  const prompt = `
    作为一名高级理财教学顾问，请根据以下学生的模拟实训提交记录，为老师生成一份深度的学情分析报告。

    **原始数据：**
    ${JSON.stringify(dataSummary, null, 2)}

    **分析任务：**
    1. **总体概述**：简要评价全班整体表现。
    2. **分层分析**：根据分数将学生分为 3 个组别（例如：卓越/优秀、良好/中等、待加强/基础薄弱）。
    3. **特征画像**：对于每个组别，提取他们的共性特征（例如：沟通能力强但专业知识弱）。
    4. **知识点提取**：对于每个组别，明确列出他们“已掌握的知识点”和“普遍缺失的知识点”。
    5. **教学建议**：针对每个组别给出具体的改进建议。

    **输出格式：**
    请直接返回 JSON 格式数据。
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overallSummary: { type: Type.STRING, description: "A comprehensive summary of the class performance." },
          groups: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                level: { type: Type.STRING, enum: ["high", "medium", "low"], description: "The performance level identifier" },
                label: { type: Type.STRING, description: "The display label for the group, e.g., '优秀 (85-100分)'" },
                studentNames: { type: Type.ARRAY, items: { type: Type.STRING } },
                averageScore: { type: Type.NUMBER },
                characteristics: { type: Type.STRING, description: "Summary of behavioral or knowledge characteristics" },
                masteredKnowledge: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of concepts this group understands well" },
                missingKnowledge: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of concepts this group struggles with" },
                suggestion: { type: Type.STRING, description: "Specific teaching advice for this group" }
              },
              required: ["level", "label", "studentNames", "averageScore", "characteristics", "masteredKnowledge", "missingKnowledge", "suggestion"]
            }
          }
        },
        required: ["overallSummary", "groups"]
      }
    }
  });

  if (!response.text) {
     throw new Error("Failed to generate analysis.");
  }

  return JSON.parse(response.text) as AnalysisReport;
};
