import { nodesInCell } from "./design";
import type { NodeKind, OperationalDesign } from "./types";

export const LAYOUT = {
  padX: 36,
  padY: 28,
  phaseHeaderH: 42,
  dpBarH: 58,
  leftGutter: 176,
  endW: 196,
  loeH: 100,
  legendH: 64,
  slot: 76,
  phaseMin: 210,
};

export interface PhaseLayout {
  id: string;
  name: string;
  x: number;
  width: number;
}

export interface NodeLayout {
  id: string;
  loeId: string;
  phaseId: string;
  label: string;
  kind: NodeKind;
  x: number;
  y: number;
}

export interface DpLayout {
  id: string;
  label: string;
  x: number;
  y: number;
}

export interface LoeLayout {
  id: string;
  name: string;
  color: string;
  y: number;
  x1: number;
  x2: number;
}

export interface DepLayout {
  id: string;
  fromId: string;
  toId: string;
  d: string;
}

export interface DiagramLayout {
  width: number;
  height: number;
  title: string;
  purpose: string;
  phases: PhaseLayout[];
  loes: LoeLayout[];
  nodes: NodeLayout[];
  dps: DpLayout[];
  dependencies: DepLayout[];
  dpBar: { x: number; y: number; width: number; height: number };
  endState: { cx: number; cy: number; rx: number; ry: number; name: string };
  plot: { x: number; y: number; width: number; height: number };
}

export function layoutDiagram(design: OperationalDesign): DiagramLayout {
  const L = LAYOUT;
  const phases = design.phases;
  const titleH = design.purpose.trim() ? 64 : 44;

  const phaseWidths = phases.map((phase) => {
    const maxInPhase = Math.max(
      1,
      ...design.linesOfEffort.map(
        (loe) => nodesInCell(design, loe.id, phase.id).length,
      ),
    );
    return Math.max(L.phaseMin, L.slot * (maxInPhase + 0.6));
  });

  const phasesWidth = phaseWidths.reduce((a, b) => a + b, 0);
  const width = L.padX * 2 + L.leftGutter + phasesWidth + L.endW;
  const plotY = L.padY + titleH + L.phaseHeaderH;
  const plotH = L.dpBarH + design.linesOfEffort.length * L.loeH;
  const height = plotY + plotH + L.legendH + L.padY;

  let x = L.padX + L.leftGutter;
  const phaseLayouts: PhaseLayout[] = phases.map((phase, i) => {
    const layout = { id: phase.id, name: phase.name, x, width: phaseWidths[i] };
    x += phaseWidths[i];
    return layout;
  });

  const plotX = L.padX + L.leftGutter;
  const loeTop = plotY + L.dpBarH;
  const loes: LoeLayout[] = design.linesOfEffort.map((loe, i) => ({
    id: loe.id,
    name: loe.name,
    color: loe.color,
    y: loeTop + i * L.loeH + L.loeH / 2,
    x1: plotX - 8,
    x2: plotX + phasesWidth + 18,
  }));

  const nodes: NodeLayout[] = [];
  for (const loe of loes) {
    for (const phase of phaseLayouts) {
      const cell = nodesInCell(design, loe.id, phase.id);
      const n = cell.length;
      cell.forEach((node, i) => {
        const t = (i + 1) / (n + 1);
        nodes.push({
          id: node.id,
          loeId: loe.id,
          phaseId: phase.id,
          label: node.label,
          kind: node.kind,
          x: phase.x + t * phase.width,
          y: loe.y,
        });
      });
    }
  }

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const dependencies: DepLayout[] = [];
  for (const dep of design.dependencies) {
    const from = byId.get(dep.fromId);
    const to = byId.get(dep.toId);
    if (!from || !to) continue;
    dependencies.push({
      id: dep.id,
      fromId: dep.fromId,
      toId: dep.toId,
      d: dependencyPath(from, to),
    });
  }

  const dpY = plotY + L.dpBarH / 2;
  const dps: DpLayout[] = design.decisionPoints.map((dp) => {
    const phase = phaseLayouts.find((p) => p.id === dp.afterPhaseId);
    const boundaryX = phase ? phase.x + phase.width : plotX + phasesWidth;
    return { id: dp.id, label: dp.label, x: boundaryX, y: dpY };
  });

  const loeAreaH = Math.max(L.loeH, design.linesOfEffort.length * L.loeH);
  const endCx = plotX + phasesWidth + L.endW / 2 + 4;
  const endCy = loeTop + loeAreaH / 2;
  const endRy = Math.max(72, loeAreaH * 0.42);
  const endRx = 78;

  return {
    width,
    height,
    title: design.title,
    purpose: design.purpose,
    phases: phaseLayouts,
    loes,
    nodes,
    dps,
    dependencies,
    dpBar: {
      x: plotX,
      y: plotY,
      width: phasesWidth,
      height: L.dpBarH,
    },
    endState: {
      cx: endCx,
      cy: endCy,
      rx: endRx,
      ry: endRy,
      name: design.endState.name,
    },
    plot: { x: plotX, y: plotY, width: phasesWidth, height: plotH },
  };
}

export function dependencyPath(
  a: { x: number; y: number },
  b: { x: number; y: number },
): string {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dy) < 6) {
    const bulge = (dx >= 0 ? -1 : 1) * 30;
    const mx = (a.x + b.x) / 2;
    return `M${a.x},${a.y} Q${mx},${a.y + bulge} ${b.x},${b.y}`;
  }
  const mx = (a.x + b.x) / 2;
  return `M${a.x},${a.y} C${mx},${a.y} ${mx},${b.y} ${b.x},${b.y}`;
}

export function hitPhaseAtX(
  laidOut: DiagramLayout,
  x: number,
): PhaseLayout | null {
  return (
    laidOut.phases.find((p) => x >= p.x && x <= p.x + p.width) ??
    laidOut.phases[laidOut.phases.length - 1] ??
    null
  );
}
