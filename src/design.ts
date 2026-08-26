import type {
  DesignNode,
  Dependency,
  GatePlacement,
  NodeKind,
  OperationalDesign,
} from "./types";

export function nodesOnLoe(
  design: OperationalDesign,
  loeId: string,
): DesignNode[] {
  const phaseIndex = new Map(design.phases.map((p, i) => [p.id, i]));
  return design.nodes
    .filter((n) => n.loeId === loeId)
    .sort((a, b) => {
      const pa = phaseIndex.get(a.phaseId) ?? 0;
      const pb = phaseIndex.get(b.phaseId) ?? 0;
      if (pa !== pb) return pa - pb;
      return a.order - b.order;
    });
}

export function nodesInCell(
  design: OperationalDesign,
  loeId: string,
  phaseId: string,
): DesignNode[] {
  return design.nodes
    .filter((n) => n.loeId === loeId && n.phaseId === phaseId)
    .sort((a, b) => a.order - b.order);
}

export function nextOrder(
  design: OperationalDesign,
  loeId: string,
  phaseId: string,
): number {
  const inCell = nodesInCell(design, loeId, phaseId);
  if (inCell.length === 0) return 0;
  return Math.max(...inCell.map((n) => n.order)) + 1;
}

export function nodeKindLabel(kind: NodeKind, plural = false): string {
  if (kind === "milestone") return plural ? "Milestones" : "Milestone";
  return plural ? "Conditions" : "Condition";
}

export function nodeKindShort(kind: NodeKind): string {
  return kind === "milestone" ? "M" : "C";
}

export function nextLabel(
  design: OperationalDesign,
  loeId: string,
  kind: NodeKind,
): string {
  const n = design.nodes.filter((x) => x.loeId === loeId && x.kind === kind).length + 1;
  return `${nodeKindShort(kind)}${n}`;
}

export function sortNodes(design: OperationalDesign): DesignNode[] {
  return design.nodes.slice().sort((a, b) => {
    const la = design.linesOfEffort.findIndex((l) => l.id === a.loeId);
    const lb = design.linesOfEffort.findIndex((l) => l.id === b.loeId);
    if (la !== lb) return la - lb;
    const pa = design.phases.findIndex((p) => p.id === a.phaseId);
    const pb = design.phases.findIndex((p) => p.id === b.phaseId);
    if (pa !== pb) return pa - pb;
    return a.order - b.order;
  });
}

export function wouldCreateCycle(
  deps: Dependency[],
  fromId: string,
  toId: string,
): boolean {
  if (fromId === toId) return true;
  const adj = new Map<string, string[]>();
  for (const d of deps) {
    const list = adj.get(d.fromId) ?? [];
    list.push(d.toId);
    adj.set(d.fromId, list);
  }
  const stack = [toId];
  const seen = new Set<string>();
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === fromId) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const next of adj.get(cur) ?? []) stack.push(next);
  }
  return false;
}

export function hasDependency(
  deps: Dependency[],
  fromId: string,
  toId: string,
): boolean {
  return deps.some((d) => d.fromId === fromId && d.toId === toId);
}

export type DetailNodeRow = {
  id: string;
  kind: NodeKind;
  label: string;
  description: string;
  phaseName: string;
};

export type DetailGateRow = {
  id: string;
  label: string;
  description: string;
  phaseName: string;
  placement: GatePlacement;
};

export type DetailStream = {
  id: string;
  name: string;
  color: string;
  purpose: string;
  nodes: DetailNodeRow[];
};

/** Grouping for the list figure under the picture. */
export function detailFigureModel(design: OperationalDesign): {
  gates: DetailGateRow[];
  streams: DetailStream[];
} {
  const phaseName = (id: string) =>
    design.phases.find((p) => p.id === id)?.name ?? "";
  const phaseIndex = new Map(design.phases.map((p, i) => [p.id, i]));
  const gates = design.decisionPoints
    .slice()
    .sort((a, b) => {
      const pa = phaseIndex.get(a.afterPhaseId) ?? 0;
      const pb = phaseIndex.get(b.afterPhaseId) ?? 0;
      if (pa !== pb) return pa - pb;
      if (a.placement !== b.placement) return a.placement === "in" ? -1 : 1;
      if (a.order !== b.order) return a.order - b.order;
      return a.id.localeCompare(b.id);
    })
    .map((dp) => ({
      id: dp.id,
      label: dp.label,
      description: dp.description,
      phaseName: phaseName(dp.afterPhaseId),
      placement: dp.placement,
    }));
  const streams = design.linesOfEffort.map((loe) => ({
    id: loe.id,
    name: loe.name,
    color: loe.color,
    purpose: loe.purpose,
    nodes: nodesOnLoe(design, loe.id).map((n) => ({
      id: n.id,
      kind: n.kind,
      label: n.label,
      description: n.description,
      phaseName: phaseName(n.phaseId),
    })),
  }));
  return { gates, streams };
}

/** Decision gates sit on the campaign, not on a workstream. */
export const DETAIL_GATE_MAX_COLS = 3;

export function detailGateColumns(gateCount: number): number {
  return Math.min(DETAIL_GATE_MAX_COLS, Math.max(1, gateCount));
}

/** Nodes and gates that belong to one phase, for a Word/A4 detail page. */
export function designForDetailPhase(
  design: OperationalDesign,
  phaseId: string,
): OperationalDesign | null {
  const nodes = design.nodes.filter((n) => n.phaseId === phaseId);
  const decisionPoints = design.decisionPoints.filter(
    (dp) => dp.afterPhaseId === phaseId,
  );
  if (nodes.length === 0 && decisionPoints.length === 0) return null;
  const linesOfEffort = design.linesOfEffort.filter((loe) =>
    nodes.some((n) => n.loeId === loe.id),
  );
  return { ...design, nodes, decisionPoints, linesOfEffort };
}

/** Keep workstream items in phase order for the list and exports. */
export function streamPhaseGroups(
  nodes: DetailNodeRow[],
  phaseNames: string[],
): Array<{ name: string; nodes: DetailNodeRow[] }> {
  const by = new Map<string, DetailNodeRow[]>();
  for (const n of nodes) {
    const key = n.phaseName || "";
    const list = by.get(key) ?? [];
    list.push(n);
    by.set(key, list);
  }
  const groups: Array<{ name: string; nodes: DetailNodeRow[] }> = [];
  for (const name of phaseNames) {
    const list = by.get(name);
    if (list?.length) {
      groups.push({ name, nodes: list });
      by.delete(name);
    }
  }
  for (const [name, list] of by) {
    if (list.length) groups.push({ name, nodes: list });
  }
  return groups;
}
