import { conditionsInCell } from "./design";
import type { OperationalDesign } from "./types";

export const LAYOUT = {
  padX: 36,
  padY: 28,
  titleH: 44,
  phaseHeaderH: 42,
  dpBarH: 58,
  leftGutter: 168,
  endW: 196,
  loeH: 96,
  legendH: 52,
  slot: 72,
  phaseMin: 210,
};

export interface PhaseLayout {
  id: string;
  name: string;
  x: number;
  width: number;
}

export interface ConditionLayout {
  id: string;
  loeId: string;
  phaseId: string;
  label: string;
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

export interface DiagramLayout {
  width: number;
  height: number;
  title: string;
  phases: PhaseLayout[];
  loes: LoeLayout[];
  conditions: ConditionLayout[];
  dps: DpLayout[];
  dpBar: { x: number; y: number; width: number; height: number };
  endState: { cx: number; cy: number; rx: number; ry: number; name: string };
  plot: { x: number; y: number; width: number; height: number };
}

export function layoutDiagram(design: OperationalDesign): DiagramLayout {
  const L = LAYOUT;
  const phases = design.phases;

  const phaseWidths = phases.map((phase) => {
    const maxInPhase = Math.max(
      1,
      ...design.linesOfEffort.map(
        (loe) => conditionsInCell(design, loe.id, phase.id).length,
      ),
    );
    return Math.max(L.phaseMin, L.slot * (maxInPhase + 0.6));
  });

  const phasesWidth = phaseWidths.reduce((a, b) => a + b, 0);
  const width = L.padX * 2 + L.leftGutter + phasesWidth + L.endW;
  const plotY = L.padY + L.titleH + L.phaseHeaderH;
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

  const conditions: ConditionLayout[] = [];
  for (const loe of loes) {
    for (const phase of phaseLayouts) {
      const cell = conditionsInCell(design, loe.id, phase.id);
      const n = cell.length;
      cell.forEach((c, i) => {
        const t = (i + 1) / (n + 1);
        conditions.push({
          id: c.id,
          loeId: loe.id,
          phaseId: phase.id,
          label: c.label,
          x: phase.x + t * phase.width,
          y: loe.y,
        });
      });
    }
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
    phases: phaseLayouts,
    loes,
    conditions,
    dps,
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
