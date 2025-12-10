export interface ChatRequest {
  sessionId: string;
  taskConfig: any;
  message: string;
}

export interface EvaluateRequest {
  taskConfig: any;
  messages: any[];
}

export interface AnalysisRequest {
  submissions: any[];
}

export interface LLMProvider {
  sendChatMessage(payload: ChatRequest): Promise<string>;
  evaluateTranscript(payload: EvaluateRequest): Promise<any>;
  analyzeClass(payload: AnalysisRequest): Promise<any>;
}
