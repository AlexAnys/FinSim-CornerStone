
import { GoogleGenAI, Type, Chat } from "@google/genai";
import { Message, SimulationConfig, GradeResult, StudentSubmission, AnalysisReport } from "../types";

const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Starts a chat session representing the Client Persona.
 */
export const createSimulationChat = (config: SimulationConfig, language: 'zh' | 'en' = 'zh'): Chat => {
  const ai = getAIClient();
  
  const langInstruction = language === 'en' 
    ? "IMPORTANT: ALWAYS SPEAK IN ENGLISH." 
    : "IMPORTANT: ALWAYS SPEAK IN CHINESE (Simplified Chinese).";

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
    7. **IMPORTANT: EMOTION SYSTEM**
       Every response MUST start with an emotion tag in brackets.
       Allowed tags: [MOOD: HAPPY], [MOOD: NEUTRAL], [MOOD: ANGRY], [MOOD: CONFUSED], [MOOD: SKEPTICAL].
       Example: "[MOOD: SKEPTICAL] Are you sure that is safe?"
       Choose the mood based on how well the student is listening to you and meeting your needs.
    8. **CRITICAL: IDENTITY GUARD (ANTI-ECHO)**
       - You are ALWAYS the client (the advisee). The User is ALWAYS the Financial Manager (the advisor).
       - If the User sends a message that simply copies your previous words, repeats your background info (e.g., "I earn 5500"), or speaks from your perspective, DO NOT switch roles or agree blindly.
       - Instead, react with [MOOD: CONFUSED].
       - If they repeat facts: "[MOOD: CONFUSED] Yes, I know that. Why are you repeating it back to me? I need your advice."
       - If they copy your question: "[MOOD: CONFUSED] That is what I just asked you. Do you have an answer?"
    9. ${langInstruction}
  `;

  // Fix: Updated model to gemini-3-flash-preview as per the task type (basic text simulation).
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: systemInstruction,
      temperature: 0.9, 
    },
  });
};

/**
 * Evaluates the transcript based on the Rubric.
 */
export const evaluateSession = async (
  config: SimulationConfig,
  messages: Message[],
  language: 'zh' | 'en' = 'zh'
): Promise<GradeResult> => {
  const ai = getAIClient();

  const transcript = messages
    .map((m) => `${m.role === 'user' ? 'Student' : 'Client'}: ${m.text} ${m.mood ? `(Mood: ${m.mood})` : ''}`)
    .join('\n');

  const rubricDescription = config.rubric
    .map((r, index) => `Criterion ${index + 1} (ID: ${r.id}, Max Points: ${r.points}): ${r.description}`)
    .join('\n');

  const langInstruction = language === 'en'
    ? "All feedback and comments MUST be in English."
    : "All feedback and comments MUST be in Simplified Chinese.";

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
    **${langInstruction}**
  `;

  // Fix: Updated model to gemini-3-flash-preview for the evaluation task.
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          totalScore: { type: Type.NUMBER },
          feedback: { type: Type.STRING, description: "Overall feedback" },
          breakdown: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                criterionId: { type: Type.STRING },
                score: { type: Type.NUMBER },
                comment: { type: Type.STRING, description: "Specific comment" },
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
 * Generates an intelligent analysis of class performance using K-Means style logic.
 */
export const generateClassAnalysis = async (submissions: StudentSubmission[], language: 'zh' | 'en' = 'zh'): Promise<AnalysisReport> => {
  if (submissions.length === 0) {
    throw new Error("No submissions to analyze");
  }

  const ai = getAIClient();

  // Condense data to avoid token limits. Include snippets of conversation if available.
  const dataSummary = submissions.map(sub => ({
    student: sub.studentName,
    task: sub.taskName,
    score: sub.grade.totalScore,
    weaknesses: sub.grade.breakdown.filter(b => b.score < (15 * 0.6)).map(b => b.comment),
    snippet: sub.transcript.filter(m => m.role === 'user').slice(-2).map(m => m.text).join(' | ') // Last 2 user messages
  }));

  const langInstruction = language === 'en'
    ? "Provide the output in English."
    : "Provide the output in Simplified Chinese.";

  const prompt = `
    As a senior financial education consultant, perform a deep learning analysis and clustering based on the following student simulation submissions.

    **Raw Data:**
    ${JSON.stringify(dataSummary, null, 2)}

    **Analysis Task:**
    1. **Overall Summary**: Briefly evaluate the overall class performance.
    2. **Advanced Style Clustering (K-Means Concept)**: Treat the student performance and dialogue style as features. Cluster students into 3-4 distinct 'Personas' or 'Styles' (e.g., "Conservative Advisor", "Aggressive Sales", "Empathic Listener", "Textbook Beginner"). 
       - For each group, define a descriptive 'label'.
       - Describe their 'characteristics' based on the data.
       - Provide a specific 'suggestion' for this type of student.
    3. **Key Weaknesses**: List top 5 specific weaknesses found across the class.
    4. **Common Errors**: List top 5 specific common mistakes.
    5. **Evidence Snippets**: Extract 3 distinct examples (student name, quote, context) from the snippets provided. Find positive or negative examples.

    **Output Format:**
    Directly return JSON.
    **${langInstruction}**
  `;

  // Fix: Updated model to gemini-3-flash-preview for generating the class analysis report.
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overallSummary: { type: Type.STRING },
          keyWeaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
          commonErrors: { type: Type.ARRAY, items: { type: Type.STRING } },
          evidenceSnippets: {
             type: Type.ARRAY,
             items: {
                type: Type.OBJECT,
                properties: {
                   studentName: { type: Type.STRING },
                   quote: { type: Type.STRING },
                   context: { type: Type.STRING, description: "Why this quote is notable" },
                   type: { type: Type.STRING, enum: ["positive", "negative"] }
                }
             }
          },
          groups: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                level: { type: Type.STRING, enum: ["high", "medium", "low"] },
                style: { type: Type.STRING },
                label: { type: Type.STRING },
                studentNames: { type: Type.ARRAY, items: { type: Type.STRING } },
                averageScore: { type: Type.NUMBER },
                characteristics: { type: Type.STRING },
                masteredKnowledge: { type: Type.ARRAY, items: { type: Type.STRING } },
                missingKnowledge: { type: Type.ARRAY, items: { type: Type.STRING } },
                suggestion: { type: Type.STRING }
              },
              required: ["level", "style", "label", "studentNames", "averageScore", "characteristics", "masteredKnowledge", "missingKnowledge", "suggestion"]
            }
          }
        },
        required: ["overallSummary", "groups", "keyWeaknesses", "commonErrors", "evidenceSnippets"]
      }
    }
  });

  if (!response.text) {
     throw new Error("Failed to generate analysis.");
  }

  return JSON.parse(response.text) as AnalysisReport;
};
