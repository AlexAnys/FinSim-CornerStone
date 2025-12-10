
export interface ScoringCriterion {
  id: string;
  points: number;
  description: string;
}

export enum StrictnessLevel {
  LENIENT = '宽松',
  MODERATE = '较为宽松',
  STRICT = '较为严苛',
  VERY_STRICT = '严苛'
}

export interface SimulationConfig {
  taskName: string;
  requirements: string;
  scenario: string; // The client background
  openingLine: string;
  dialogueRequirements: string; // What the student needs to achieve
  evaluatorPersona: string; // "You are a senior financial planner..."
  rubric: ScoringCriterion[];
  strictness: StrictnessLevel;
}

// Persisted Task in DB
export interface TaskRecord extends SimulationConfig {
  id: string;
  createdAt: number;
  updatedAt: number;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface GradeResult {
  totalScore: number;
  maxScore: number;
  feedback: string;
  breakdown: {
    criterionId: string;
    score: number;
    comment: string;
  }[];
}

export interface SessionRecord {
  id: string;
  userId: string;
  taskId: string;
  taskName: string;
  startedAt: number;
  endedAt: number;
}

// Student Submission in DB
export interface StudentSubmission {
  id: string;
  studentName: string;
  studentId: string; // Linked to User ID
  taskId: string;
  taskName: string;
  submittedAt: number;
  grade: GradeResult;
  transcript: Message[];
}

// Smart Analysis Structures
export interface AnalysisGroup {
  level: 'high' | 'medium' | 'low'; // For coloring
  label: string; // e.g. "优秀 (90-100分)"
  studentNames: string[];
  averageScore: number;
  characteristics: string; // Main traits of this group
  masteredKnowledge: string[]; // List of mastered points
  missingKnowledge: string[]; // List of weak points
  suggestion: string; // Teaching suggestion for this group
}

export interface AnalysisReport {
  overallSummary: string;
  groups: AnalysisGroup[];
}

// Auth Types
export type UserRole = 'teacher' | 'student';

export interface User {
  id: string;
  email: string;
  name: string; // Display Name
  role: UserRole;
  avatar?: string;
}
