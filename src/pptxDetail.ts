import { detailFigureModel, streamPhaseGroups } from "./design";
import { wrapLabel } from "./wrap";
import type { DiagramPalette } from "./theme";
import {
  CONDITION_FILL,
  MILESTONE_FILL,
  type NodeKind,
  type OperationalDesign,
} from "./types";

const FONT = "Arial";
const GATE = "#2E7D32";
const GATE_LINE = "#1B5E20";
/** Keep in step with PPTX_SLIDE in pptx.ts. */
const SLIDE = { width: 13.333, height: 7.5 } as const;
const PHASE_H = 0.22;
const NAME_LINE_H = 0.22;
const LABEL_LINE_H = 0.2;
const DESC_LINE_H = 0.18;
const META_LINE_H = 0.17;
const ITEM_GAP = 0.06;
const CARD_BOTTOM_PAD = 0.18;
/** Inches per character — slightly wide so we over-estimate wrap, never under. */
const CHAR = {
  name: 0.1,
  label: 0.09,
  desc: 0.082,
} as const;
/** Minimum body under the stream header for at least one stacked item. */
const MIN_ITEM_BODY = 1.15;

type PptxSlide = {
  background?: { color?: string };
  addText: (
    text: string | Array<{ text: string; options?: object }>,
    opts?: object,
  ) => unknown;
  addShape: (type: string, opts: object) => unknown;
};

type Box = { x: number; y: number; w: number; h: number };

export type DetailSlideLayout = {
  continued: boolean;
  title: Box;
  subtitle: Box;
  gatesHeading: Box | null;
  gates: Array<
    Box & {
      id: string;
      label: string;
      meta: string;
      desc: string;
      labelBox: Box;
      metaBox: Box | null;
      descBox: Box | null;
    }
  >;
  streams: Array<{
    id: string;
    name: string;
    color: string;
    purpose: string;
    card: Box;
    bar: Box;
    nameBox: Box;
    purposeBox: Box | null;
    empty: Box | null;
    phases: Array<{
      name: string;
      heading: Box;
      items: Array<{
        id: string;
        kind: NodeKind;
        text: string;
        mark: Box;
        label: Box;
        desc: Box | null;
        labelLines: string[];
        descLines: string[];
      }>;
    }>;
  }>;
};

function hex(css: string): string {
  const rgba = css.match(
    /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/,
  );
  if (rgba) {
    const to = (n: string) =>
      Math.max(0, Math.min(255, Math.round(Number(n))))
        .toString(16)
        .padStart(2, "0");
    return `${to(rgba[1])}${to(rgba[2])}${to(rgba[3])}`.toUpperCase();
  }
  return css.replace("#", "").replace(/^([0-9a-fA-F]{3})$/, (_, t: string) =>
    t
      .split("")
      .map((c) => c + c)
      .join(""),
  ).toUpperCase();
}

function wrapInches(
  text: string,
  widthIn: number,
  charIn: number = CHAR.desc,
): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const chars = Math.max(8, Math.floor(widthIn / charIn));
  return wrapLabel(trimmed, chars, 10_000).filter(Boolean);
}

type StreamUnit =
  | { kind: "phase"; name: string; h: number }
  | {
      kind: "item";
      id: string;
      nodeKind: NodeKind;
      text: string;
      labelLines: string[];
      descLines: string[];
      labelH: number;
      h: number;
    };

type ItemUnit = Extract<StreamUnit, { kind: "item" }>;

function itemHeight(labelH: number, descLines: string[]): number {
  return labelH + descLines.length * DESC_LINE_H + ITEM_GAP;
}

function streamUnits(
  stream: {
    nodes: Array<{
      id: string;
      kind: NodeKind;
      label: string;
      description: string;
      phaseName: string;
    }>;
  },
  phaseNames: string[],
  textW: number,
): StreamUnit[] {
  const units: StreamUnit[] = [];
  for (const group of streamPhaseGroups(stream.nodes, phaseNames)) {
    if (group.name) units.push({ kind: "phase", name: group.name, h: PHASE_H });
    for (const node of group.nodes) {
      const labelLines = wrapInches(node.label, textW, CHAR.label);
      const descLines = wrapInches(node.description, textW, CHAR.desc);
      const labelH = Math.max(LABEL_LINE_H, labelLines.length * LABEL_LINE_H);
      units.push({
        kind: "item",
        id: node.id,
        nodeKind: node.kind,
        text: node.label,
        labelLines,
        descLines,
        labelH,
        h: itemHeight(labelH, descLines),
      });
    }
  }
  return units;
}

function splitItem(
  unit: ItemUnit,
  maxH: number,
): { head: ItemUnit; tail: ItemUnit | null } {
  const minHead = itemHeight(unit.labelH, []);
  if (unit.h <= maxH) return { head: unit, tail: null };
  const maxLines = Math.max(
    0,
    Math.floor((Math.max(maxH, minHead) - unit.labelH - ITEM_GAP) / DESC_LINE_H),
  );
  const headLines = unit.descLines.slice(0, maxLines);
  const tailLines = unit.descLines.slice(maxLines);
  return {
    head: { ...unit, descLines: headLines, h: itemHeight(unit.labelH, headLines) },
    tail: tailLines.length
      ? { ...unit, descLines: tailLines, h: itemHeight(unit.labelH, tailLines) }
      : null,
  };
}

function takeUnits(
  units: StreamUnit[],
  maxH: number,
): { taken: StreamUnit[]; rest: StreamUnit[] } {
  if (units.length === 0) return { taken: [], rest: [] };
  const taken: StreamUnit[] = [];
  let used = 0;
  let i = 0;

  const splitAt = (item: ItemUnit, space: number, after: StreamUnit[]) => {
    const { head, tail } = splitItem(item, Math.max(space, item.labelH + ITEM_GAP));
    taken.push(head);
    return { taken, rest: tail ? [tail, ...after] : after };
  };

  for (; i < units.length; i++) {
    const unit = units[i];
    if (used + unit.h <= maxH + 1e-6) {
      taken.push(unit);
      used += unit.h;
      continue;
    }
    if (unit.kind === "item") {
      const space = maxH - used;
      if (taken.length === 0 || space >= unit.labelH + DESC_LINE_H) {
        return splitAt(unit, space, units.slice(i + 1));
      }
      break;
    }
    break;
  }

  while (taken.length && taken[taken.length - 1].kind === "phase") {
    taken.pop();
    i -= 1;
  }

  if (taken.length === 0) {
    const first = units[0];
    if (first.kind === "item") {
      return splitAt(first, maxH, units.slice(1));
    }
    if (first.kind === "phase" && units[1]?.kind === "item") {
      taken.push(first);
      return splitAt(units[1], maxH - first.h, units.slice(2));
    }
    return { taken: [first], rest: units.slice(1) };
  }

  return { taken, rest: units.slice(taken.length) };
}

function phasesFromUnits(
  units: StreamUnit[],
  nameBox: Box,
  startY: number,
): DetailSlideLayout["streams"][number]["phases"] {
  const phases: DetailSlideLayout["streams"][number]["phases"] = [];
  let cy = startY;
  let current: DetailSlideLayout["streams"][number]["phases"][number] | null =
    null;
  const open = (name: string) => {
    const heading: Box = { x: nameBox.x, y: cy, w: nameBox.w, h: PHASE_H };
    const next = {
      name,
      heading,
      items: [] as DetailSlideLayout["streams"][number]["phases"][number]["items"],
    };
    phases.push(next);
    cy += PHASE_H;
    current = next;
    return next;
  };
  for (const unit of units) {
    if (unit.kind === "phase") {
      open(unit.name);
      continue;
    }
    const phase = current ?? open("");
    const mark: Box = { x: nameBox.x, y: cy + 0.03, w: 0.14, h: 0.14 };
    const label: Box = {
      x: nameBox.x + 0.2,
      y: cy,
      w: nameBox.w - 0.2,
      h: unit.labelH,
    };
    let desc: Box | null = null;
    if (unit.descLines.length) {
      desc = {
        x: label.x,
        y: label.y + label.h,
        w: label.w,
        h: unit.descLines.length * DESC_LINE_H,
      };
    }
    phase.items.push({
      id: unit.id,
      kind: unit.nodeKind,
      text: unit.text,
      mark,
      label,
      desc,
      labelLines: unit.labelLines,
      descLines: unit.descLines,
    });
    cy += unit.h;
  }
  return phases;
}

type GateDraft = {
  id: string;
  label: string;
  meta: string;
  desc: string;
  labelLines: string[];
  metaLines: string[];
  descLines: string[];
  h: number;
};

type PlacedGate = DetailSlideLayout["gates"][number];

function gateInner(
  card: Box,
  draft: Pick<
    GateDraft,
    "label" | "meta" | "desc" | "labelLines" | "metaLines" | "descLines"
  >,
): Pick<PlacedGate, "labelBox" | "metaBox" | "descBox"> {
  const gpad = 0.12;
  const textX = card.x + gpad + 0.22;
  const textW = Math.max(0.4, card.w - gpad * 2 - 0.22);
  let y = card.y + gpad;
  const labelBox: Box = {
    x: textX,
    y,
    w: textW,
    h: Math.max(LABEL_LINE_H, draft.labelLines.length * LABEL_LINE_H),
  };
  y += labelBox.h + 0.02;
  const metaBox: Box | null = draft.metaLines.length
    ? {
        x: textX,
        y,
        w: textW,
        h: draft.metaLines.length * META_LINE_H,
      }
    : null;
  if (metaBox) y += metaBox.h;
  const descBox: Box | null = draft.descLines.length
    ? { x: textX, y, w: textW, h: draft.descLines.length * DESC_LINE_H }
    : null;
  return { labelBox, metaBox, descBox };
}

function placeGates(
  drafts: GateDraft[],
  colX: (i: number) => number,
  colW: number,
  startY: number,
  nCols: number,
): PlacedGate[] {
  const placed: PlacedGate[] = [];
  let y = startY;
  let rowH = 0;
  drafts.forEach((g, i) => {
    const col = i % nCols;
    if (col === 0 && i > 0) {
      y += rowH + 0.1;
      rowH = 0;
    }
    const card: Box = { x: colX(i), y, w: colW, h: g.h };
    placed.push({
      ...card,
      id: g.id,
      label: g.label,
      meta: g.meta,
      desc: g.desc,
      ...gateInner(card, g),
    });
    rowH = Math.max(rowH, g.h);
  });
  const byRow = new Map<number, PlacedGate[]>();
  for (const g of placed) {
    const list = byRow.get(g.y) ?? [];
    list.push(g);
    byRow.set(g.y, list);
  }
  for (const row of byRow.values()) {
    const h = Math.max(...row.map((g) => g.h));
    for (const g of row) {
      g.h = h;
      const inner = gateInner(g, {
        label: g.label,
        meta: g.meta,
        desc: g.desc,
        labelLines: wrapInches(g.label, g.labelBox.w, CHAR.label),
        metaLines: wrapInches(g.meta, g.labelBox.w, CHAR.desc),
        descLines: wrapInches(g.desc, g.labelBox.w, CHAR.desc),
      });
      g.labelBox = inner.labelBox;
      g.metaBox = inner.metaBox;
      g.descBox = inner.descBox;
    }
  }
  return placed;
}

function pageChrome(continued: boolean): Pick<
  DetailSlideLayout,
  "continued" | "title" | "subtitle"
> {
  const m = 0.38;
  const innerW = SLIDE.width - m * 2;
  return {
    continued,
    title: { x: m, y: m, w: innerW, h: 0.32 },
    subtitle: { x: m, y: m + 0.3, w: innerW, h: 0.22 },
  };
}

function streamHeader(
  name: string,
  purpose: string,
  card: Box,
): { nameBox: Box; purposeBox: Box | null } {
  const pad = 0.16;
  const nameW = card.w - pad * 2 - 0.08;
  const nameX = card.x + pad + 0.08;
  const nameLines = wrapInches(name, nameW, CHAR.name);
  const nameBox: Box = {
    x: nameX,
    y: card.y + 0.12,
    w: nameW,
    h: Math.max(NAME_LINE_H, nameLines.length * NAME_LINE_H),
  };
  const purposeLines = wrapInches(purpose, nameW, CHAR.desc);
  const purposeBox = purposeLines.length
    ? {
        x: nameBox.x,
        y: nameBox.y + nameBox.h + 0.02,
        w: nameBox.w,
        h: purposeLines.length * META_LINE_H + 0.02,
      }
    : null;
  return { nameBox, purposeBox };
}

function emptyStreamCards(
  model: ReturnType<typeof detailFigureModel>,
  colX: (i: number) => number,
  colW: number,
  y: number,
  cardH: number,
  continued: boolean,
  hadContent: boolean[],
): DetailSlideLayout["streams"] {
  return model.streams.map((stream, i) => {
    const card: Box = { x: colX(i), y, w: colW, h: cardH };
    const name = continued && hadContent[i] ? `${stream.name} (continued)` : stream.name;
    const purpose = continued ? "" : stream.purpose.trim();
    const { nameBox, purposeBox } = streamHeader(name, purpose, card);
    return {
      id: stream.id,
      name,
      color: stream.color,
      purpose,
      card,
      bar: {
        x: card.x + 0.05,
        y: card.y + 0.12,
        w: 0.07,
        h: Math.max(0.2, card.h - 0.24),
      },
      nameBox,
      purposeBox,
      empty: null,
      phases: [],
    };
  });
}

function contentStartY(slot: DetailSlideLayout["streams"][number]): number {
  return (
    (slot.purposeBox
      ? slot.purposeBox.y + slot.purposeBox.h
      : slot.nameBox.y + slot.nameBox.h) + 0.08
  );
}

function headerStackH(name: string, purpose: string, colW: number): number {
  const card: Box = { x: 0, y: 0, w: colW, h: 7 };
  const { nameBox, purposeBox } = streamHeader(name, purpose, card);
  return contentStartY({
    id: "",
    name,
    color: "",
    purpose,
    card,
    bar: card,
    nameBox,
    purposeBox,
    empty: null,
    phases: [],
  });
}

/** One or more 16:9 pages. Long copy continues; type is not shrunk or overlapped. */
export function layoutDetailSlides(
  design: OperationalDesign,
): DetailSlideLayout[] {
  const m = 0.38;
  const innerW = SLIDE.width - m * 2;
  const bottom = SLIDE.height - m;
  const model = detailFigureModel(design);
  const nCols = Math.max(1, model.streams.length);
  const gap = 0.18;
  const colW = (innerW - gap * (nCols - 1)) / nCols;
  const colX = (i: number) => m + (i % nCols) * (colW + gap);
  const phaseNames = design.phases.map((p) => p.name);
  const pad = 0.16;
  const textW = colW - pad * 2 - 0.08 - 0.2;
  const gateTextW = colW - 0.12 * 2 - 0.22;

  const gateDrafts: GateDraft[] = model.gates.map((g) => {
    const meta = `${g.placement === "in" ? "In" : "After"} ${g.phaseName}`.trim();
    const desc = g.description.trim();
    const labelLines = wrapInches(g.label, gateTextW, CHAR.label);
    const metaLines = wrapInches(meta, gateTextW, CHAR.desc);
    const descLines = wrapInches(desc, gateTextW, CHAR.desc);
    const h =
      0.12 +
      Math.max(LABEL_LINE_H, labelLines.length * LABEL_LINE_H) +
      0.02 +
      metaLines.length * META_LINE_H +
      descLines.length * DESC_LINE_H +
      0.12;
    return {
      id: g.id,
      label: g.label,
      meta,
      desc,
      labelLines,
      metaLines,
      descLines,
      h,
    };
  });

  const remaining = model.streams.map((stream) =>
    streamUnits(stream, phaseNames, textW),
  );
  const hadContent = model.streams.map((stream) => stream.nodes.length > 0);
  const pages: DetailSlideLayout[] = [];
  let streamsStarted = false;

  const fillStreams = (page: DetailSlideLayout, y: number) => {
    const cardH = Math.max(1.4, bottom - y);
    page.streams = emptyStreamCards(
      model,
      colX,
      colW,
      y,
      cardH,
      streamsStarted,
      hadContent,
    );
    page.streams.forEach((slot, i) => {
      const startY = contentStartY(slot);
      const avail = slot.card.y + slot.card.h - CARD_BOTTOM_PAD - startY;
      if (model.streams[i].nodes.length === 0 && !streamsStarted) {
        slot.empty = {
          x: slot.nameBox.x,
          y: startY,
          w: slot.nameBox.w,
          h: 0.22,
        };
        remaining[i] = [];
        return;
      }
      if (avail < MIN_ITEM_BODY && remaining[i].length > 0) {
        return;
      }
      const { taken, rest } = takeUnits(remaining[i], Math.max(avail, 0.2));
      remaining[i] = rest;
      slot.phases = phasesFromUnits(taken, slot.nameBox, startY);
      if (taken.length) hadContent[i] = true;
    });
    streamsStarted = true;
  };

  if (gateDrafts.length) {
    const chrome = pageChrome(false);
    let y = m + 0.58;
    const heading: Box = { x: m, y, w: innerW, h: 0.2 };
    y += 0.22;
    const placed = placeGates(gateDrafts, colX, colW, y, nCols);
    const gatesH = placed.length
      ? Math.max(...placed.map((g) => g.y + g.h)) - y
      : 0;
    const streamY = y + gatesH + 0.16;
    const headerNeed = Math.max(
      ...model.streams.map((s) => headerStackH(s.name, s.purpose, colW)),
      0.5,
    );
    const roomForStreams =
      bottom - streamY >= headerNeed + MIN_ITEM_BODY;
    const page: DetailSlideLayout = {
      ...chrome,
      gatesHeading: heading,
      gates: placed,
      streams: [],
    };
    if (roomForStreams) fillStreams(page, streamY);
    pages.push(page);
  }

  let guard = 0;
  while (remaining.some((units) => units.length > 0) || pages.length === 0) {
    if (++guard > 80) break;
    const before = remaining.reduce((n, u) => n + u.length, 0);
    const chrome = pageChrome(streamsStarted);
    const page: DetailSlideLayout = {
      ...chrome,
      gatesHeading: null,
      gates: [],
      streams: [],
    };
    fillStreams(page, m + 0.58);
    pages.push(page);
    const after = remaining.reduce((n, u) => n + u.length, 0);
    if (after >= before && remaining.some((units) => units.length > 0)) break;
    if (remaining.every((units) => units.length === 0)) break;
  }

  return pages;
}

export function layoutDetailSlide(design: OperationalDesign): DetailSlideLayout {
  return layoutDetailSlides(design)[0];
}

function paintDetailPage(
  slide: PptxSlide,
  laid: DetailSlideLayout,
  design: OperationalDesign,
  palette: DiagramPalette,
) {
  const noLine = { color: hex(palette.bg), transparency: 100 };
  const paper = hex(palette.phaseA);
  const ink = hex(palette.label);
  const muted = hex(palette.purpose);

  function label(
    value: string,
    box: Box,
    opts: {
      size: number;
      color: string;
      bold?: boolean;
      valign?: "top" | "middle";
    },
  ) {
    slide.addText(value, {
      x: box.x,
      y: box.y,
      w: box.w,
      h: box.h,
      fontFace: FONT,
      fontSize: opts.size,
      color: opts.color,
      bold: opts.bold ?? false,
      margin: 0,
      valign: opts.valign ?? "top",
      wrap: true,
    });
  }

  label(design.title.trim() || "Detail", laid.title, {
    size: 18,
    color: hex(palette.title),
    bold: true,
    valign: "middle",
  });
  label(
    laid.continued
      ? "Gates, milestones, and conditions (continued)"
      : "Gates, milestones, and conditions",
    laid.subtitle,
    { size: 11, color: muted, valign: "middle" },
  );

  if (laid.gatesHeading) {
    label("Gates", laid.gatesHeading, {
      size: 11,
      color: hex(palette.phase),
      bold: true,
    });
  }

  for (const g of laid.gates) {
    slide.addShape("roundRect", {
      x: g.x,
      y: g.y,
      w: g.w,
      h: g.h,
      fill: { color: paper },
      line: noLine,
      rectRadius: 0.06,
    });
    const gpad = 0.12;
    slide.addShape("star5", {
      x: g.x + gpad,
      y: g.y + gpad + 0.02,
      w: 0.16,
      h: 0.16,
      fill: { color: hex(GATE) },
      line: { color: hex(GATE_LINE), width: 0.6 },
    });
    label(g.label, g.labelBox, { size: 12, color: ink, bold: true });
    if (g.meta && g.metaBox) {
      label(g.meta, g.metaBox, { size: 10, color: muted });
    }
    if (g.desc && g.descBox) {
      label(g.desc, g.descBox, { size: 10, color: ink });
    }
  }

  for (const stream of laid.streams) {
    slide.addShape("roundRect", {
      x: stream.card.x,
      y: stream.card.y,
      w: stream.card.w,
      h: stream.card.h,
      fill: { color: paper },
      line: noLine,
      rectRadius: 0.06,
    });
    slide.addShape("rect", {
      x: stream.bar.x,
      y: stream.bar.y,
      w: stream.bar.w,
      h: stream.bar.h,
      fill: { color: hex(stream.color) },
      line: noLine,
    });
    label(stream.name, stream.nameBox, {
      size: 13,
      color: hex(stream.color),
      bold: true,
    });
    if (stream.purposeBox && stream.purpose) {
      label(stream.purpose, stream.purposeBox, {
        size: 10,
        color: muted,
      });
    }
    if (stream.empty) {
      label("No milestones or conditions.", stream.empty, {
        size: 10,
        color: muted,
      });
    }
    for (const phase of stream.phases) {
      if (phase.name) {
        label(phase.name.toUpperCase(), phase.heading, {
          size: 9,
          color: muted,
          bold: true,
        });
      }
      for (const item of phase.items) {
        slide.addShape(item.kind === "milestone" ? "triangle" : "diamond", {
          x: item.mark.x,
          y: item.mark.y,
          w: item.mark.w,
          h: item.mark.h,
          fill: {
            color: hex(
              item.kind === "milestone" ? MILESTONE_FILL : CONDITION_FILL,
            ),
          },
          line: noLine,
        });
        label(item.labelLines.join("\n") || item.text, item.label, {
          size: 11,
          color: ink,
          bold: true,
        });
        if (item.desc && item.descLines.length) {
          label(item.descLines.join("\n"), item.desc, {
            size: 10,
            color: ink,
          });
        }
      }
    }
  }
}

export function addDetailSlides(
  pptx: { addSlide: () => unknown },
  design: OperationalDesign,
  palette: DiagramPalette,
) {
  for (const page of layoutDetailSlides(design)) {
    const slide = pptx.addSlide() as PptxSlide;
    slide.background = { color: hex(palette.bg) };
    paintDetailPage(slide, page, design, palette);
  }
}
