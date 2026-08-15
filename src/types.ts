export type NodeKind = "milestone" | "decisive_condition";

export interface Phase {
  id: string;
  name: string;
}

export interface LineOfEffort {
  id: string;
  name: string;
  color: string;
}

export interface Condition {
  id: string;
  loeId: string;
  phaseId: string;
  label: string;
  description: string;
  order: number;
}

export interface DecisionPoint {
  id: string;
  label: string;
  afterPhaseId: string;
  description: string;
}

export interface OperationalDesign {
  id: string;
  title: string;
  endState: {
    name: string;
    description: string;
  };
  nodeKind: NodeKind;
  phases: Phase[];
  linesOfEffort: LineOfEffort[];
  conditions: Condition[];
  decisionPoints: DecisionPoint[];
}

export type Selection =
  | { type: "phase"; id: string }
  | { type: "loe"; id: string }
  | { type: "condition"; id: string }
  | { type: "dp"; id: string }
  | { type: "endState" }
  | { type: "title" }
  | null;

export const LOE_COLORS = [
  "#E87722",
  "#5B8C2A",
  "#3D9AD1",
  "#8E4585",
  "#C0392B",
  "#2A6F7F",
  "#C4A35A",
  "#4A5568",
] as const;
