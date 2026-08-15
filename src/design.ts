import type {
  DesignNode,
  Dependency,
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
