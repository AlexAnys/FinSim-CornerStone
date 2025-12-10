import { Message, SimulationConfig, GradeResult, StudentSubmission, AnalysisReport } from "../types";
import { auth } from '../firebase';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL
  ?? ((import.meta as any).env?.MODE === 'production' ? '/api' : 'http://localhost:8080/api');

const getAuthHeaders = async () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated for API call.");
  }
  const token = await user.getIdToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export const createSimulationChat = async (config: SimulationConfig): Promise<string> => {
  return config.openingLine;
};

export const sendMessageToAPI = async (sessionId: string, taskConfig: SimulationConfig, message: string): Promise<string> => {
  const response = await fetch(`${API_BASE_URL}/chat/send`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ sessionId, taskConfig, message })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to get AI response from secure backend.');
  }

  const data = await response.json();
  return data.text;
};

export const evaluateSession = async (
  config: SimulationConfig,
  messages: Message[]
): Promise<GradeResult> => {
  const response = await fetch(`${API_BASE_URL}/evaluate`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ taskConfig: config, messages })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to get evaluation from secure backend.');
  }

  return response.json();
};

export const generateClassAnalysis = async (submissions: StudentSubmission[]): Promise<AnalysisReport> => {
  const response = await fetch(`${API_BASE_URL}/analysis`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ submissions })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to generate analysis from secure backend.');
  }

  return response.json();
};
