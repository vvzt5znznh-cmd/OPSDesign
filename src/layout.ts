import type { GatePlacement, NodeKind, OperationalDesign } from "./types";

export const LAYOUT = {
  padX: 40,
  padY: 32,
  phaseHeaderH: 46,
  dpBarH: 76,
  leftGutter: 204,
  addGap: 44,
  outcomeW: 176,
  loeH: 112,
  legendH: 58,
  slot: 84,
  phaseMin: 220,
};

export interface PhaseLayout {
  id: string;
  name: string;
  x: number;
  width: number;
  slots: number;
}

export interface NodeLayout {
  id: string;
  loeId: string;
  phaseId: string;
  label: string;
  kind: NodeKind;
  x: number;
  y: number;
  column: number;
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
  purpose: string;
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
  endCol: { x: number; y: number; width: number; height: number };
  endState: {
    x: number;
    y: number;
    width: number;
    height: number;
    name: string;
  };
  plot: { x: number; y: number; width: number; height: number };
}

/** Visual column per node: preferred `order`, then after same-phase predecessors. */
export function nodeColumns(design: OperationalDesign): Map<string, number> {
  const cols = new Map<string, number>();
  for (const n of design.nodes) {
    cols.set(n.id, Math.max(0, Math.floor(n.order)));
  }

  const preds = new Map<string, string[]>();
  for (const n of design.nodes) preds.set(n.id, []);
  for (const d of design.dependencies) {
    const from = design.nodes.find((n) => n.id === d.fromId);
    const to = design.nodes.find((n) => n.id === d.toId);
    if (!from || !to || from.phaseId !== to.phaseId) continue;
    preds.get(to.id)!.push(from.id);
  }

  const cap = Math.max(2, design.nodes.length + 2);
  for (let pass = 0; pass < cap; pass++) {
    let changed = false;
    for (const n of design.nodes) {
      let min = cols.get(n.id) ?? 0;
      for (const p of preds.get(n.id) ?? []) {
        min = Math.max(min, (cols.get(p) ?? 0) + 1);
      }
      if (min !== (cols.get(n.id) ?? 0)) {
        cols.set(n.id, min);
        changed = true;
      }
    }
    for (const phase of design.phases) {
      for (const loe of design.linesOfEffort) {
        const group = design.nodes
          .filter((n) => n.phaseId === phase.id && n.loeId === loe.id)
          .sort((a, b) => {
            const ca = cols.get(a.id) ?? 0;
            const cb = cols.get(b.id) ?? 0;
            if (ca !== cb) return ca - cb;
            if (a.order !== b.order) return a.order - b.order;
            return a.id.localeCompare(b.id);
          });
        let last = -1;
        for (const n of group) {
          const c = cols.get(n.id) ?? 0;
          const next = c <= last ? last + 1 : c;
          if (next !== c) changed = true;
          cols.set(n.id, next);
          last = next;
        }
      }
    }
    if (!changed) break;
  }

  return cols;
}

export function minColumnInPhase(
  design: OperationalDesign,
  columns: Map<string, number>,
  nodeId: string,
  phaseId: string,
): number {
  let min = 0;
  for (const d of design.dependencies) {
    if (d.toId !== nodeId) continue;
    const from = design.nodes.find((n) => n.id === d.fromId);
    if (!from || from.phaseId !== phaseId) continue;
    min = Math.max(min, (columns.get(from.id) ?? Math.max(0, from.order)) + 1);
  }
  return min;
}

export function columnAtX(phase: PhaseLayout, x: number): number {
  if (phase.slots <= 0 || phase.width <= 0) return 0;
  const slotW = phase.width / phase.slots;
  const col = Math.floor((x - phase.x) / slotW);
  return Math.max(0, Math.min(phase.slots - 1, col));
}

export function layoutDiagram(design: OperationalDesign): DiagramLayout {
  const L = LAYOUT;
  const phases = design.phases;
  const titleH = design.purpose.trim() ? 64 : 44;
  const columns = nodeColumns(design);

  const phaseMeta = phases.map((phase) => {
    const inPhase = design.nodes.filter((n) => n.phaseId === phase.id);
    const used = inPhase.reduce(
      (max, n) => Math.max(max, (columns.get(n.id) ?? 0) + 1),
      1,
    );
    const slots = used + 1;
    const width = Math.max(L.phaseMin, L.slot * slots);
    return {
      slots: Math.max(slots, Math.round(width / L.slot)),
      width,
    };
  });

  const phasesWidth = phaseMeta.reduce((a, p) => a + p.width, 0);
  const width =
    L.padX * 2 + L.leftGutter + phasesWidth + L.addGap + L.outcomeW;
  const plotY = L.padY + titleH + L.phaseHeaderH;
  const plotH = L.dpBarH + design.linesOfEffort.length * L.loeH;
  const height = plotY + plotH + L.legendH + L.padY;

  let x = L.padX + L.leftGutter;
  const phaseLayouts: PhaseLayout[] = phases.map((phase, i) => {
    const layout = {
      id: phase.id,
      name: phase.name,
      x,
      width: phaseMeta[i].width,
      slots: phaseMeta[i].slots,
    };
    x += phaseMeta[i].width;
    return layout;
  });

  const plotX = L.padX + L.leftGutter;
  const outcomeX = plotX + phasesWidth + L.addGap;
  const loeTop = plotY + L.dpBarH;
  const loeAreaH = Math.max(L.loeH, design.linesOfEffort.length * L.loeH);
  const cardW = 148;
  const cardH = 56;
  const endX = outcomeX + (L.outcomeW - cardW) / 2;
  const endY = loeTop + loeAreaH / 2 - cardH / 2;
  const loes: LoeLayout[] = design.linesOfEffort.map((loe, i) => ({
    id: loe.id,
    name: loe.name,
    color: loe.color,
    purpose: loe.purpose ?? "",
    y: loeTop + i * L.loeH + L.loeH / 2,
    x1: plotX - 8,
    x2: endX - 8,
  }));
  const loeY = new Map(loes.map((l) => [l.id, l.y]));
  const phaseById = new Map(phaseLayouts.map((p) => [p.id, p]));

  const nodes: NodeLayout[] = design.nodes.map((node) => {
    const phase = phaseById.get(node.phaseId);
    const column = columns.get(node.id) ?? 0;
    const slots = phase?.slots ?? 1;
    const xPos = phase
      ? phase.x + ((column + 0.5) / slots) * phase.width
      : 0;
    return {
      id: node.id,
      loeId: node.loeId,
      phaseId: node.phaseId,
      label: node.label,
      kind: node.kind,
      x: xPos,
      y: loeY.get(node.loeId) ?? 0,
      column,
    };
  });

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
  const dps: DpLayout[] = [];
  for (const phase of phaseLayouts) {
    const inPhase = design.decisionPoints
      .filter((dp) => dp.afterPhaseId === phase.id && dp.placement === "in")
      .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
    inPhase.forEach((dp, i) => {
      const x =
        phase.x + ((i + 1) / (inPhase.length + 1)) * phase.width;
      dps.push({ id: dp.id, label: dp.label, x, y: dpY });
    });
    const afterPhase = design.decisionPoints.filter(
      (dp) => dp.afterPhaseId === phase.id && dp.placement !== "in",
    );
    afterPhase.forEach((dp, i) => {
      dps.push({
        id: dp.id,
        label: dp.label,
        x: phase.x + phase.width + i * 18,
        y: dpY,
      });
    });
  }
  for (const dp of design.decisionPoints) {
    if (dps.some((d) => d.id === dp.id)) continue;
    dps.push({
      id: dp.id,
      label: dp.label,
      x: plotX + phasesWidth,
      y: dpY,
    });
  }

  const bandY = plotY - 42;
  const bandH = plotH + 42;

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
    endCol: {
      x: outcomeX,
      y: bandY,
      width: L.outcomeW,
      height: bandH,
    },
    endState: {
      x: endX,
      y: endY,
      width: cardW,
      height: cardH,
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

export function snapGateAtX(
  phases: PhaseLayout[],
  x: number,
): { phaseId: string; placement: GatePlacement; order: number } | null {
  if (phases.length === 0) return null;
  type Snap = {
    x: number;
    phaseId: string;
    placement: GatePlacement;
    order: number;
  };
  const snaps: Snap[] = [];
  for (const phase of phases) {
    const slots = Math.max(2, phase.slots);
    for (let order = 0; order < slots; order++) {
      snaps.push({
        x: phase.x + ((order + 0.5) / slots) * phase.width,
        phaseId: phase.id,
        placement: "in",
        order,
      });
    }
    snaps.push({
      x: phase.x + phase.width,
      phaseId: phase.id,
      placement: "after",
      order: 0,
    });
  }
  let best = snaps[0];
  let dist = Math.abs(x - best.x);
  for (const snap of snaps) {
    const d = Math.abs(x - snap.x);
    if (d < dist) {
      best = snap;
      dist = d;
    }
  }
  return best;
}
