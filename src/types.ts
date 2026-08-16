export type NodeKind = "milestone" | "condition";

export interface Phase {
  id: string;
  name: string;
}

export interface LineOfEffort {
  id: string;
  name: string;
  color: string;
  /** One-line purpose, shown under the name. */
  purpose: string;
}

export interface DesignNode {
  id: string;
  kind: NodeKind;
  loeId: string;
  phaseId: string;
  label: string;
  description: string;
  /** Preferred column in the phase (0 = earliest). Layout may shift it right. */
  order: number;
}

export interface Dependency {
  id: string;
  fromId: string;
  toId: string;
}

export type GatePlacement = "in" | "after";

export interface DecisionPoint {
  id: string;
  label: string;
  /** Phase this gate belongs to. */
  afterPhaseId: string;
  /** Inside the phase, or on the seam after it. */
  placement: GatePlacement;
  /** Preferred slot when placement is "in". */
  order: number;
  description: string;
}

export interface OperationalDesign {
  id: string;
  title: string;
  purpose: string;
  endState: {
    name: string;
    description: string;
  };
  phases: Phase[];
  linesOfEffort: LineOfEffort[];
  nodes: DesignNode[];
  dependencies: Dependency[];
  decisionPoints: DecisionPoint[];
}

export type Selection =
  | { type: "phase"; id: string }
  | { type: "loe"; id: string }
  | { type: "node"; id: string }
  | { type: "dp"; id: string }
  | { type: "dependency"; id: string }
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

export const MILESTONE_FILL = "#C62828";
export const CONDITION_FILL = "#0F4C81";
