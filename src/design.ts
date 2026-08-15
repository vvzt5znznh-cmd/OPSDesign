import type { Condition, OperationalDesign } from "./types";

export function conditionsOnLoe(
  design: OperationalDesign,
  loeId: string,
): Condition[] {
  const phaseIndex = new Map(design.phases.map((p, i) => [p.id, i]));
  return design.conditions
    .filter((c) => c.loeId === loeId)
    .sort((a, b) => {
      const pa = phaseIndex.get(a.phaseId) ?? 0;
      const pb = phaseIndex.get(b.phaseId) ?? 0;
      if (pa !== pb) return pa - pb;
      return a.order - b.order;
    });
}

export function conditionsInCell(
  design: OperationalDesign,
  loeId: string,
  phaseId: string,
): Condition[] {
  return design.conditions
    .filter((c) => c.loeId === loeId && c.phaseId === phaseId)
    .sort((a, b) => a.order - b.order);
}

export function nextOrder(
  design: OperationalDesign,
  loeId: string,
  phaseId: string,
): number {
  const inCell = conditionsInCell(design, loeId, phaseId);
  if (inCell.length === 0) return 0;
  return Math.max(...inCell.map((c) => c.order)) + 1;
}

export function nodeKindLabel(
  kind: OperationalDesign["nodeKind"],
  plural = false,
): string {
  if (kind === "milestone") return plural ? "Milestones" : "Milestone";
  return plural ? "Decisive Conditions" : "Decisive Condition";
}

export function nodeKindShort(kind: OperationalDesign["nodeKind"]): string {
  return kind === "milestone" ? "M" : "DC";
}
