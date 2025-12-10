import { GoogleGenAI, Type } from '@google/genai';
import type { LLMProvider, ChatRequest, EvaluateRequest, AnalysisRequest } from './llmProvider.js';

interface SessionState {
  systemInstruction: string;
  history: { role: 'user' | 'model'; parts: string[] }[];
}

const buildSystemInstruction = (config: any) => `
  你正在扮演理财客户，与学生(理财经理)进行中文对话。保持角色设定：
  ${config.scenario}

  对话要求：
  - 学生需要完成的任务：${config.requirements}
  - 对话目标：${config.dialogueRequirements}
  - 开场白（学生已收到，无需重复）：${config.openingLine}
  - 只用简体中文作答，保持口语化和真实性，每次回复不超过 3-4 句。
`;

const buildEvaluationPrompt = (config: any, messages: any[]) => {
  const transcript = messages
    .map((m: any) => `${m.role === 'user' ? 'Student (Financial Manager)' : 'Client (AI)'}: ${m.text}`)
    .join('\n');

  const rubricDescription = config.rubric
    .map((r: any, index: number) => `Criterion ${index + 1} (ID: ${r.id}, Max Points: ${r.points}): ${r.description}`)
    .join('\n');

  return `
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
};

export class GeminiProvider implements LLMProvider {
  private client: GoogleGenAI;
  private sessions: Map<string, SessionState> = new Map();

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async sendChatMessage(payload: ChatRequest): Promise<string> {
    const { sessionId, taskConfig, message } = payload;
    if (!sessionId) throw new Error('Missing sessionId');

    const state = this.sessions.get(sessionId) || {
      systemInstruction: buildSystemInstruction(taskConfig),
      history: []
    };

    const contents = [
      ...state.history,
      { role: 'user' as const, parts: [message] }
    ];

    const response = await this.client.models.generateContent({
      model: 'gemini-2.5-flash',
      systemInstruction: state.systemInstruction,
      contents,
      generationConfig: {
        temperature: 0.9
      }
    });

    const text = response.text || response.response?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || '';
    state.history.push({ role: 'user', parts: [message] });
    state.history.push({ role: 'model', parts: [text] });
    this.sessions.set(sessionId, state);
    return text;
  }

  async evaluateTranscript(payload: EvaluateRequest): Promise<any> {
    const prompt = buildEvaluationPrompt(payload.taskConfig, payload.messages);

    const response = await this.client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            totalScore: { type: Type.NUMBER },
            feedback: { type: Type.STRING },
            breakdown: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  criterionId: { type: Type.STRING },
                  score: { type: Type.NUMBER },
                  comment: { type: Type.STRING }
                },
                required: ['criterionId', 'score', 'comment']
              }
            }
          },
          required: ['totalScore', 'feedback', 'breakdown']
        }
      }
    });

    const result = response.text ? JSON.parse(response.text) : {};
    const maxScore = payload.taskConfig.rubric.reduce((acc: number, curr: any) => acc + curr.points, 0);
    return { ...result, maxScore };
  }

  async analyzeClass(payload: AnalysisRequest): Promise<any> {
    const dataSummary = payload.submissions.map((sub: any) => ({
      student: sub.studentName,
      task: sub.taskName,
      score: sub.grade.totalScore,
      maxScore: sub.grade.maxScore,
      weaknesses: sub.grade.breakdown.filter((b: any) => b.score < (15 * 0.6)).map((b: any) => b.comment),
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

    const response = await this.client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallSummary: { type: Type.STRING },
            groups: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  level: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
                  label: { type: Type.STRING },
                  studentNames: { type: Type.ARRAY, items: { type: Type.STRING } },
                  averageScore: { type: Type.NUMBER },
                  characteristics: { type: Type.STRING },
                  masteredKnowledge: { type: Type.ARRAY, items: { type: Type.STRING } },
                  missingKnowledge: { type: Type.ARRAY, items: { type: Type.STRING } },
                  suggestion: { type: Type.STRING }
                },
                required: ['level', 'label', 'studentNames', 'averageScore', 'characteristics', 'masteredKnowledge', 'missingKnowledge', 'suggestion']
              }
            }
          },
          required: ['overallSummary', 'groups']
        }
      }
    });

    return response.text ? JSON.parse(response.text) : {};
  }
}

export const getProvider = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }
  return new GeminiProvider(apiKey);
};
