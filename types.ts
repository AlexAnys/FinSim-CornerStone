
export type UserRole = 'student' | 'teacher';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  className?: string; // New: Class Name
}

export enum StrictnessLevel {
  LENIENT = 'LENIENT',
  MODERATE = 'MODERATE',
  STRICT = 'STRICT',
  VERY_STRICT = 'VERY_STRICT'
}

export interface ScoringCriterion {
  id: string;
  points: number;
  description: string;
}

export interface AllocationItemConfig {
  id: string;
  label: string;
}

export interface AllocationSectionConfig {
  id: string;
  title: string;
  items: AllocationItemConfig[];
}

export interface SimulationConfig {
  taskName: string;
  requirements: string;
  scenario: string;
  openingLine: string;
  dialogueRequirements: string;
  evaluatorPersona: string;
  rubric: ScoringCriterion[];
  strictness: StrictnessLevel;
  allocationConfig?: AllocationSectionConfig[];
}

export interface TaskRecord extends SimulationConfig {
  id: string;
  createdAt: number;
  updatedAt: number;
  creatorId: string;
  creatorName: string;
}

// New: Task Assignment (Publish Record)
export interface TaskAssignment {
  id: string;
  taskId: string;
  teacherId: string;
  className: string;
  groupIds: string[]; // Empty means entire class
  createdAt: number;
  title?: string; // Optional display title override
}

// New: Student Group
export interface StudentGroup {
  id: string;
  teacherId: string;
  className: string;
  name: string;
  type: 'manual' | 'auto-score-bucket';
  studentIds: string[];
  createdAt: number;
  meta?: any; // For auto-grouping metadata (e.g. score range, source assignment)
}

export type Mood = 'HAPPY' | 'NEUTRAL' | 'ANGRY' | 'CONFUSED' | 'SKEPTICAL';

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  mood?: Mood;
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

export interface AssetItem {
  label: string;
  value: number;
}

export interface AssetSection {
  title: string;
  items: AssetItem[];
}

export type AssetScheme = AssetSection[];

export interface StudentSubmission {
  id: string;
  studentId: string;
  studentName: string;
  taskId: string;
  teacherId?: string;
  taskName: string;
  grade: GradeResult;
  transcript: Message[];
  assets?: AssetScheme;
  submittedAt: number;
  
  // New fields for grouping/assignment tracking
  className?: string;
  groupIds?: string[];
  assignmentId?: string;

  analysisTags?: {
      keyQuestionCoverage?: Record<string, string>;
      detectedErrors?: string[];
      objectionFunnelStage?: string;
  };
}

export interface EvidenceSnippet {
   studentName: string;
   quote: string;
   context: string;
   type?: 'positive' | 'negative';
}

export interface AnalysisReport {
  overallSummary: string;
  keyWeaknesses: string[];
  commonErrors: string[];
  evidenceSnippets: EvidenceSnippet[];
  groups: {
    level: string;
    style: string;
    label: string;
    studentNames: string[];
    averageScore: number;
    characteristics: string;
    masteredKnowledge: string[];
    missingKnowledge: string[];
    suggestion: string;
  }[];
}

export interface SavedAnalysis {
  id: string;
  createdAt: number;
  studentCount: number;
  report: AnalysisReport;
}

// Insights Snapshot (Frontend Only)
export interface DimensionStat {
  id: string; // Criterion ID
  name: string;
  mean: number;
  p25: number;
  p75: number;
  belowThresholdCount: number; // e.g. < 60%
}

export interface InsightsSnapshot {
  studentCount: number;
  totalSubmissions: number; // Raw count
  avgScore: number;
  scoreDist: number[]; // [ <60, 60-79, 80-89, 90+ ]
  recentSubmissions: StudentSubmission[];
  dimensionStats: DimensionStat[];
}
