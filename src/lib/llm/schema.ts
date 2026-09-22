/**
 * Interpreter 数据契约（类型定义）。
 * 仅 type-only 导入，可被测试运行器直接加载。
 */
import type {
  Company,
  CurrentStateItem,
  Evidence,
  DimensionInsight,
  StateUpdate,
} from "@/lib/types";

export interface InterpreterInput {
  company: Company;
  researchGoal: string;
  timeWindow: string;
  currentState: CurrentStateItem[];
  evidence: Evidence[];
  keyQuestions: string[];
}

export interface EvidenceReference {
  evidenceId: string;
  relation: "supporting" | "opposing" | "contradictory" | "unknown";
  note: string;
}

export interface ContradictionNote {
  description: string;
  evidenceIds: string[];
}

export interface UnknownNote {
  description: string;
  evidenceIds: string[];
}

export interface InterpreterOutput {
  summary: string;
  dimensionInsights: DimensionInsight[];
  evidenceReferences: EvidenceReference[];
  contradictions: ContradictionNote[];
  unknowns: UnknownNote[];
  nextQuestions: string[];
  stateUpdate: StateUpdate;
}

export type InterpreterMode = "live" | "template";

export interface InterpreterResult {
  output: InterpreterOutput;
  mode: InterpreterMode;
}
