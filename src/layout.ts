import { endStateColor, loeEndStatesShown, type GatePlacement, type NodeKind, type OperationalDesign } from "./types";
import { NODE_LABEL, nodeLabelSize, wrapLabel } from "./wrap";

export const LAYOUT = {
  padX: 40,
  padY: 32,
  phaseHeaderH: 46,
  dpBarH: 76,
  leftGutter: 204,
  addGap: 44,
  /** Gap after the last phase before stream end-state pills. */
  loeEndGap: 16,
  /** Width of the per-workstream end-state column. */
  loeEndW: 160,
  /** Gap from stream pills to the campaign end-state column. */
  loeEndToPanel: 12,
  outcomeW: 232,
  loeH: 128,
  legendH: 58,
  slot: 124,
  phaseMin: 256,
  /** Drop in this many pixels of the right edge to add a column and widen the phase. */
  phaseExpand: 22,
};

/** Heading band: title and purpose wrap to the picture width. */
export const HEADING = {
  titleLh: 26,
  purposeLh: 15,
  titlePx: 12,
  purposePx: 6.6,
  titleMax: 5,
  purposeMax: 8,
  top: 10,
  gap: 8,
  bottom: 12,
};

export function wrapToWidth(
  text: string,
  widthPx: number,
  pxPerChar: number,
  maxLines: number,
): string[] {
  const chars = Math.max(8, Math.floor(widthPx / pxPerChar));
  return wrapLabel(text.trim(), chars, maxLines);
}

/** Workstream name and purpose in the left gutter, kept off the coloured line. */
export const LOE_GUTTER = {
  textX: 28,
  namePx: 7.6,
  purposePx: 5.2,
  nameLh: 16,
  purposeLh: 11,
  nameMax: 5,
  purposeMax: 6,
  gap: 4,
};

export function loeGutterTextWidth(): number {
  const lineStart = LAYOUT.padX + LAYOUT.leftGutter - 8;
  return Math.max(72, lineStart - LOE_GUTTER.textX - 12);
}

export function wrapLoeName(name: string): string[] {
  const text = name.trim() || "Workstream";
  return wrapToWidth(text, loeGutterTextWidth(), LOE_GUTTER.namePx, LOE_GUTTER.nameMax);
}

export function wrapLoePurpose(purpose: string): string[] {
  if (!purpose.trim()) return [];
  return wrapToWidth(
    purpose,
    loeGutterTextWidth(),
    LOE_GUTTER.purposePx,
    LOE_GUTTER.purposeMax,
  );
}

/** Stream outcome at the right end of each coloured line. */
export const LOE_END = {
  h: 52,
  padX: 8,
  padY: 8,
  lh: 12,
  px: 5.6,
  max: 8,
};

export function wrapLoeEndState(text: string): string[] {
  if (!text.trim()) return [];
  return wrapToWidth(
    text,
    LAYOUT.loeEndW - LOE_END.padX * 2,
    LOE_END.px,
    LOE_END.max,
  );
}

export function loeEndHeight(lines: string[]): number {
  if (!lines.length) return LOE_END.h;
  return Math.max(LOE_END.h, LOE_END.padY * 2 + lines.length * LOE_END.lh);
}

export const END_STATE_TEXT = {
  nameMax: 6,
  descMax: 10_000,
  nameLh: 18,
  descLh: 14,
  namePx: 7.2,
  descPx: 6.2,
  padY: 12,
  padX: 8,
  gap: 8,
  inset: 4,
};

/** Name and “what will be true” share the panel centre, with a tight inner margin. */
export function endStateTextBox(end: {
  x: number;
  y: number;
  width: number;
  height: number;
  nameLines: string[];
  descriptionLines: string[];
}) {
  const T = END_STATE_TEXT;
  const nameH = end.nameLines.length * T.nameLh;
  const descH = end.descriptionLines.length * T.descLh;
  const gap =
    end.nameLines.length && end.descriptionLines.length ? T.gap : 0;
  const top = end.y + (end.height - (nameH + gap + descH)) / 2;
  const cx = end.x + end.width / 2;
  return {
    top,
    nameH,
    gap,
    descH,
    nameX: cx,
    descX: cx,
    descW: end.width - T.padX * 2,
  };
}

export interface PhaseLayout {
  id: string;
  name: string;
  x: number;
  width: number;
  slots: number;
  slotWidths: number[];
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
  endState: string;
  nameLines: string[];
  purposeLines: string[];
  y: number;
  height: number;
  x1: number;
  x2: number;
}

export interface LoeEndStateLayout {
  id: string;
  text: string;
  lines: string[];
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
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
  titleLines: string[];
  purposeLines: string[];
  phases: PhaseLayout[];
  loes: LoeLayout[];
  loeEndStates: LoeEndStateLayout[];
  loeEndCol: { x: number; y: number; width: number; height: number };
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
    description: string;
    color: string;
    nameLines: string[];
    descriptionLines: string[];
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
  const widths = phase.slotWidths;
  if (!widths.length) return 0;
  const rel = x - phase.x;
  if (rel >= phase.width - LAYOUT.phaseExpand) return widths.length;
  let acc = 0;
  for (let i = 0; i < widths.length; i++) {
    acc += widths[i];
    if (rel < acc) return i;
  }
  return widths.length - 1;
}

/** Early / middle / late columns in a default-width phase. */
export function minPhaseSlots(): number {
  return 3;
}

/** How wide a phase is for a given number of occupied columns (1-based). */
export function phaseMetrics(usedColumns: number): { slots: number; width: number } {
  const used = Math.max(1, Math.floor(usedColumns));
  const minSlots = minPhaseSlots();
  if (used <= minSlots) {
    return { slots: minSlots, width: LAYOUT.phaseMin };
  }
  return { slots: used, width: LAYOUT.slot * used };
}

/** Slot widths so each label fits, with empty columns keeping a drop target. */
export function phaseBand(
  design: OperationalDesign,
  phaseId: string,
  columns: Map<string, number>,
): { slots: number; width: number; slotWidths: number[] } {
  const inPhase = design.nodes.filter((n) => n.phaseId === phaseId);
  const used = inPhase.reduce(
    (max, n) => Math.max(max, (columns.get(n.id) ?? 0) + 1),
    0,
  );
  const minSlots = minPhaseSlots();
  const slots = Math.max(minSlots, used, 1);
  const base = slots <= minSlots ? LAYOUT.phaseMin / slots : LAYOUT.slot;
  const widths = Array.from({ length: slots }, () => base);
  for (const n of inPhase) {
    const col = columns.get(n.id) ?? 0;
    if (col < 0 || col >= slots) continue;
    const { width } = nodeLabelSize(n.label);
    widths[col] = Math.max(widths[col], width + NODE_LABEL.gap);
  }
  const sum = widths.reduce((a, b) => a + b, 0);
  const minWidth = slots <= minSlots ? LAYOUT.phaseMin : LAYOUT.slot * slots;
  if (sum >= minWidth) {
    return { slots, width: sum, slotWidths: widths };
  }
  const extra = (minWidth - sum) / slots;
  return {
    slots,
    width: minWidth,
    slotWidths: widths.map((w) => w + extra),
  };
}

export function slotCenterX(phase: PhaseLayout, column: number): number {
  const widths = phase.slotWidths;
  if (widths.length === 0) return phase.x;
  const col = Math.max(0, Math.min(column, widths.length - 1));
  let x = phase.x;
  for (let i = 0; i < col; i++) x += widths[i];
  return x + widths[col] / 2;
}

export function loeRowHeight(design: OperationalDesign, loeId: string): number {
  const loe = design.linesOfEffort.find((item) => item.id === loeId);
  let labelH = 0;
  for (const n of design.nodes) {
    if (n.loeId !== loeId) continue;
    labelH = Math.max(labelH, nodeLabelSize(n.label).height);
  }
  const purposeLines = wrapLoePurpose(loe?.purpose ?? "").length;
  const nameLines = wrapLoeName(loe?.name ?? "").length;
  const fromNodes = 20 + NODE_LABEL.markToLabel + labelH + 16;
  const fromGutter =
    nameLines * LOE_GUTTER.nameLh +
    (purposeLines ? LOE_GUTTER.gap + purposeLines * LOE_GUTTER.purposeLh : 0) +
    20;
  const fromEnd = loeEndStatesShown(design)
    ? loeEndHeight(wrapLoeEndState(loe?.endState ?? "")) + 16
    : 0;
  return Math.max(LAYOUT.loeH, fromNodes, fromGutter, fromEnd);
}

export function layoutDiagram(design: OperationalDesign): DiagramLayout {
  const L = LAYOUT;
  const H = HEADING;
  const phases = design.phases;
  const columns = nodeColumns(design);

  const phaseMeta = phases.map((phase) => phaseBand(design, phase.id, columns));
  const phasesWidth = phaseMeta.reduce((a, p) => a + p.width, 0);
  const showEnds = loeEndStatesShown(design);
  const endBand = showEnds
    ? L.loeEndGap + L.loeEndW + L.loeEndToPanel
    : L.addGap;
  const width =
    L.padX * 2 + L.leftGutter + phasesWidth + endBand + L.outcomeW;
  const textWidth = Math.max(240, width - L.padX * 2);
  const titleLines = wrapToWidth(
    design.title || "Untitled",
    textWidth,
    H.titlePx,
    H.titleMax,
  );
  const purposeLines = design.purpose.trim()
    ? wrapToWidth(design.purpose, textWidth - 40, H.purposePx, H.purposeMax)
    : [];
  const headingH =
    H.top +
    titleLines.length * H.titleLh +
    (purposeLines.length ? H.gap + purposeLines.length * H.purposeLh : 0) +
    H.bottom;

  const maxGateLines = design.decisionPoints.reduce(
    (max, dp) => Math.max(max, wrapLabel(dp.label, 16, 4).length),
    1,
  );
  const dpBarH = Math.max(L.dpBarH, 32 + maxGateLines * 12 + 10);
  const loeHeights = design.linesOfEffort.map((loe) =>
    loeRowHeight(design, loe.id),
  );
  const loesH = loeHeights.reduce((a, h) => a + h, 0);
  const plotY = L.padY + headingH + L.phaseHeaderH;
  const plotH = dpBarH + loesH;

  let x = L.padX + L.leftGutter;
  const phaseLayouts: PhaseLayout[] = phases.map((phase, i) => {
    const layout = {
      id: phase.id,
      name: phase.name,
      x,
      width: phaseMeta[i].width,
      slots: phaseMeta[i].slots,
      slotWidths: phaseMeta[i].slotWidths,
    };
    x += phaseMeta[i].width;
    return layout;
  });

  const plotX = L.padX + L.leftGutter;
  const loeEndX = plotX + phasesWidth + (showEnds ? L.loeEndGap : L.addGap);
  const outcomeX = showEnds
    ? loeEndX + L.loeEndW + L.loeEndToPanel
    : loeEndX;
  const loeTop = plotY + dpBarH;
  const T = END_STATE_TEXT;
  const panelW = L.outcomeW - T.inset * 2;
  const textW = panelW - T.padX * 2;
  const nameText = design.endState.name.trim();
  const descText = design.endState.description.trim();
  const nameLines = nameText
    ? wrapToWidth(nameText, textW, T.namePx, T.nameMax)
    : [];
  const descriptionLines = descText
    ? wrapToWidth(descText, textW, T.descPx, T.descMax)
    : [];
  const textH =
    T.padY +
    nameLines.length * T.nameLh +
    (nameLines.length && descriptionLines.length ? T.gap : 0) +
    descriptionLines.length * T.descLh +
    T.padY;
  const loeYs = design.linesOfEffort.map((_, i) => {
    const top = loeTop + loeHeights.slice(0, i).reduce((a, h) => a + h, 0);
    return top + loeHeights[i] / 2;
  });
  const firstY = loeYs[0] ?? loeTop + L.loeH / 2;
  const lastY = loeYs[loeYs.length - 1] ?? firstY;
  const arrowPad = 28;
  const spanH = lastY - firstY + arrowPad * 2;
  const panelH = Math.max(spanH, textH, 88);
  const panelX = outcomeX + T.inset;
  const mid = (firstY + lastY) / 2;
  const minY = loeTop - 12;
  let panelY = mid - panelH / 2;
  if (panelY < minY) panelY = minY;
  const panelBottom = panelY + panelH;
  const plotBottom = plotY + plotH;
  const extraH = Math.max(0, panelBottom - (plotBottom - 8));
  const loes: LoeLayout[] = design.linesOfEffort.map((loe, i) => ({
    id: loe.id,
    name: loe.name,
    color: loe.color,
    purpose: loe.purpose ?? "",
    endState: loe.endState ?? "",
    nameLines: wrapLoeName(loe.name),
    purposeLines: wrapLoePurpose(loe.purpose ?? ""),
    y: loeYs[i],
    height: loeHeights[i],
    x1: plotX - 8,
    x2: showEnds ? loeEndX : panelX,
  }));
  const loeEndStates: LoeEndStateLayout[] = showEnds
    ? design.linesOfEffort.map((loe, i) => {
        const lines = wrapLoeEndState(loe.endState ?? "");
        const height = loeEndHeight(lines);
        return {
          id: loe.id,
          text: loe.endState ?? "",
          lines,
          color: loe.color,
          x: loeEndX,
          y: loeYs[i] - height / 2,
          width: L.loeEndW,
          height,
        };
      })
    : [];
  const loeY = new Map(loes.map((l) => [l.id, l.y]));
  const phaseById = new Map(phaseLayouts.map((p) => [p.id, p]));

  const nodes: NodeLayout[] = design.nodes.map((node) => {
    const phase = phaseById.get(node.phaseId);
    const column = columns.get(node.id) ?? 0;
    return {
      id: node.id,
      loeId: node.loeId,
      phaseId: node.phaseId,
      label: node.label,
      kind: node.kind,
      x: phase ? slotCenterX(phase, column) : 0,
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

  const dpY = plotY + dpBarH / 2;
  const dps: DpLayout[] = [];
  for (const phase of phaseLayouts) {
    const inPhase = design.decisionPoints
      .filter((dp) => dp.afterPhaseId === phase.id && dp.placement === "in")
      .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
    inPhase.forEach((dp, i) => {
      const xPos =
        phase.x + ((i + 1) / (inPhase.length + 1)) * phase.width;
      dps.push({ id: dp.id, label: dp.label, x: xPos, y: dpY });
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
  const bandH = plotH + extraH + 42;
  const height = plotY + plotH + extraH + L.legendH + L.padY;

  return {
    width,
    height,
    title: design.title,
    purpose: design.purpose,
    titleLines,
    purposeLines,
    phases: phaseLayouts,
    loes,
    loeEndStates,
    loeEndCol: {
      x: showEnds ? loeEndX : outcomeX,
      y: bandY,
      width: showEnds ? L.loeEndW : 0,
      height: bandH,
    },
    nodes,
    dps,
    dependencies,
    dpBar: {
      x: plotX,
      y: plotY,
      width: phasesWidth,
      height: dpBarH,
    },
    endCol: {
      x: outcomeX,
      y: bandY,
      width: L.outcomeW,
      height: bandH,
    },
    endState: {
      x: panelX,
      y: panelY,
      width: panelW,
      height: panelH,
      name: design.endState.name,
      description: design.endState.description,
      color: endStateColor(design.endState),
      nameLines,
      descriptionLines,
    },
    plot: { x: plotX, y: plotY, width: phasesWidth, height: plotH + extraH },
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
): { phaseId: string; placement: GatePlacement; order: number; x: number } | null {
  if (phases.length === 0) return null;
  type Snap = {
    x: number;
    phaseId: string;
    placement: GatePlacement;
    order: number;
  };
  const snaps: Snap[] = [];
  for (const phase of phases) {
    const slots = Math.max(2, phase.slotWidths?.length ?? phase.slots);
    for (let order = 0; order < slots; order++) {
      snaps.push({
        x: slotCenterX(phase, order),
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
