import JSZip from "jszip";
import { copy } from "./i18n";
import { layoutDiagram, LAYOUT, END_STATE_TEXT, HEADING, LOE_GUTTER, endStateTextBox, loeGutterTextWidth } from "./layout";
import { slug } from "./storage";
import type { DiagramPalette } from "./theme";
import {
  CONDITION_FILL,
  MILESTONE_FILL,
  endStateColor,
  type NodeKind,
  type OperationalDesign,
} from "./types";
import { wrapLabel, nodeLabelSize } from "./wrap";
import { addDetailSlides } from "./pptxDetail";

const FONT = "Arial";
const GATE = "#2E7D32";
const GATE_LINE = "#1B5E20";

/** Widescreen 16:9 — same as PowerPoint LAYOUT_WIDE. */
export const PPTX_SLIDE = {
  width: 13.333,
  height: 7.5,
  margin: 0.32,
} as const;

export function pptxFitScale(picture: { width: number; height: number }): number {
  return Math.min(
    (PPTX_SLIDE.width - PPTX_SLIDE.margin * 2) / Math.max(picture.width, 1),
    (PPTX_SLIDE.height - PPTX_SLIDE.margin * 2) / Math.max(picture.height, 1),
  );
}

/** Type scales with the picture. No 8pt floor — that overflowed a busy slide. */
export function pptxFontPt(px: number, scale: number): number {
  return Math.round(Math.max(4, px * scale * 72) * 10) / 10;
}

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

function fillOf(css: string): { color: string; transparency?: number } {
  const rgba = css.match(
    /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?/,
  );
  if (rgba) {
    const a = rgba[4] != null ? Number(rgba[4]) : 1;
    return {
      color: hex(css),
      transparency: Math.round((1 - a) * 100),
    };
  }
  return { color: hex(css) };
}

const NODE_NAME = (id: string) => `OPS-node-${id}`;
const DEP_NAME = (id: string) => `OPS-dep-${id}`;

/** OOXML preset connection sites: 0 top, 1 left, 2 bottom, 3 right. Always the sides. */
export function connectionSites(
  from: { x: number; y: number },
  to: { x: number; y: number },
): { startIdx: number; endIdx: number } {
  return to.x >= from.x
    ? { startIdx: 3, endIdx: 1 }
    : { startIdx: 1, endIdx: 3 };
}

function nodeHalf(
  kind: NodeKind,
  S: (px: number) => number,
): { hw: number; hh: number } {
  return kind === "milestone"
    ? { hw: S(11), hh: S(13) }
    : { hw: S(13), hh: S(13) };
}

function sitePoint(
  n: { x: number; y: number; kind: NodeKind },
  idx: number,
  X: (px: number) => number,
  Y: (px: number) => number,
  S: (px: number) => number,
): { x: number; y: number } {
  const { hw, hh } = nodeHalf(n.kind, S);
  const cx = X(n.x);
  const cy = Y(n.y);
  if (idx === 0) return { x: cx, y: cy - hh };
  if (idx === 1) return { x: cx - hw, y: cy };
  if (idx === 2) return { x: cx, y: cy + hh };
  return { x: cx + hw, y: cy };
}

function escapeRe(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Turn pptxgenjs line shapes into PowerPoint connectors glued to the figures. */
export function glueConnectors(
  xml: string,
  deps: Array<{ id: string; fromId: string; toId: string }>,
  nodes: Array<{ id: string; x: number; y: number }>,
): string {
  const shapeId = new Map<string, string>();
  const nodeRe = /<p:cNvPr id="(\d+)" name="OPS-node-([^"]+)"/g;
  let match: RegExpExecArray | null;
  while ((match = nodeRe.exec(xml))) {
    shapeId.set(match[2], match[1]);
  }
  const byId = new Map(nodes.map((n) => [n.id, n]));

  for (const dep of deps) {
    const fromNv = shapeId.get(dep.fromId);
    const toNv = shapeId.get(dep.toId);
    const from = byId.get(dep.fromId);
    const to = byId.get(dep.toId);
    if (!fromNv || !toNv || !from || !to) continue;
    const { startIdx, endIdx } = connectionSites(from, to);
    const name = DEP_NAME(dep.id);
    const blockRe = new RegExp(
      `<p:sp><p:nvSpPr><p:cNvPr id="(\\d+)" name="${escapeRe(name)}"[\\s\\S]*?</p:sp>`,
    );
    xml = xml.replace(blockRe, (full, id: string) => {
      const spPr = full.match(/<p:spPr>[\s\S]*?<\/p:spPr>/)?.[0];
      if (!spPr) return full;
      const geom = spPr
        .replace(/prst="[^"]+"/, 'prst="curvedConnector3"')
        .replace(/<a:headEnd\b[^/]*\/>/g, "")
        .replace(/<a:tailEnd\b[^/]*\/>/g, "")
        .replace(/<a:headEnd\b[^>]*>[\s\S]*?<\/a:headEnd>/g, "")
        .replace(/<a:tailEnd\b[^>]*>[\s\S]*?<\/a:tailEnd>/g, "");
      return (
        `<p:cxnSp>` +
        `<p:nvCxnSpPr>` +
        `<p:cNvPr id="${id}" name="${name}"/>` +
        `<p:cNvCxnSpPr>` +
        `<a:stCxn id="${fromNv}" idx="${startIdx}"/>` +
        `<a:endCxn id="${toNv}" idx="${endIdx}"/>` +
        `</p:cNvCxnSpPr>` +
        `<p:nvPr/>` +
        `</p:nvCxnSpPr>` +
        geom +
        `<p:style>` +
        `<a:lnRef idx="1"><a:schemeClr val="accent1"/></a:lnRef>` +
        `<a:fillRef idx="0"><a:schemeClr val="accent1"/></a:fillRef>` +
        `<a:effectRef idx="0"><a:schemeClr val="accent1"/></a:effectRef>` +
        `<a:fontRef idx="minor"><a:schemeClr val="tx1"/></a:fontRef>` +
        `</p:style>` +
        `</p:cxnSp>`
      );
    });
  }
  return xml;
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function speakerNotes(design: OperationalDesign): string {
  const t = copy();
  const lines: string[] = [
    t.notesBriefing,
    t.notesDelete,
    "",
  ];
  if (design.purpose.trim()) {
    lines.push(`${t.notesPurpose}: ${design.purpose.trim()}`, "");
  }
  lines.push(`${t.endState}: ${design.endState.name}`);
  if (design.endState.description.trim()) {
    lines.push(design.endState.description.trim());
  }
  const streamEnds = design.showLoeEndStates
    ? design.linesOfEffort.filter((loe) => loe.endState.trim())
    : [];
  if (streamEnds.length) {
    lines.push("", t.notesLoeEnds);
    for (const loe of streamEnds) {
      lines.push(`- ${loe.name}: ${loe.endState.trim()}`);
    }
  }
  lines.push("");
  if (design.decisionPoints.length) {
    lines.push(t.decisionGates);
    for (const dp of design.decisionPoints) {
      const phase =
        design.phases.find((p) => p.id === dp.afterPhaseId)?.name ?? "";
      const where = dp.placement === "in" ? t.inWord.toLowerCase() : t.afterWord.toLowerCase();
      lines.push(
        `- ${dp.label}${phase ? ` (${where} ${phase})` : ""}`,
      );
    }
  }
  if (design.showDetail) {
    lines.push("", t.notesDetailFollows);
  }
  return lines.join("\n");
}

export { addDetailSlides, layoutDetailSlide, layoutDetailSlides } from "./pptxDetail";
export type { DetailSlideLayout } from "./pptxDetail";

export async function buildPptxArrayBuffer(
  design: OperationalDesign,
  palette: DiagramPalette,
): Promise<ArrayBuffer> {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const laid = layoutDiagram(design);
  const pptx = new PptxGenJS();
  pptx.title = design.title;
  pptx.author = "OPSDesign";
  pptx.subject = design.purpose.trim() || "Operational design";

  const slideW = PPTX_SLIDE.width;
  const slideH = PPTX_SLIDE.height;
  pptx.defineLayout({ name: "OPSDesign", width: slideW, height: slideH });
  pptx.layout = "OPSDesign";
  const slide = pptx.addSlide();
  slide.background = { color: hex(palette.bg) };
  slide.addNotes(speakerNotes(design));

  const scale = pptxFitScale(laid);
  const ox = (slideW - laid.width * scale) / 2;
  const oy = (slideH - laid.height * scale) / 2;
  const X = (px: number) => ox + px * scale;
  const Y = (px: number) => oy + px * scale;
  const S = (px: number) => Math.max(px * scale, 0.02);
  const fs = (px: number) => pptxFontPt(px, scale);
  const lw = (px: number) => Math.max(0.5, px * scale * 72);

  const noLine = { color: hex(palette.bg), transparency: 100 };

  function text(
    value: string,
    x: number,
    y: number,
    w: number,
    h: number,
    opts: {
      size: number;
      color: string;
      align?: "left" | "center" | "right";
      bold?: boolean;
      valign?: "top" | "middle" | "bottom";
    },
  ) {
    slide.addText(value, {
      x,
      y,
      w,
      h,
      fontFace: FONT,
      fontSize: opts.size,
      color: hex(opts.color),
      align: opts.align ?? "left",
      valign: opts.valign ?? "middle",
      bold: opts.bold ?? false,
      margin: 0,
      wrap: true,
    });
  }

  for (let i = 0; i < laid.phases.length; i++) {
    const phase = laid.phases[i];
    slide.addShape(pptx.ShapeType.rect, {
      x: X(phase.x),
      y: Y(laid.plot.y - 42),
      w: S(phase.width),
      h: S(laid.plot.height + 42),
      fill: { color: hex(i % 2 === 0 ? palette.phaseA : palette.phaseB) },
      line: noLine,
    });
    text(
      phase.name,
      X(phase.x),
      Y(laid.plot.y - 42),
      S(phase.width),
      S(28),
      {
        size: fs(14),
        color: palette.phase,
        align: "center",
        bold: true,
      },
    );
  }

  slide.addShape(pptx.ShapeType.rect, {
    x: X(laid.endCol.x),
    y: Y(laid.endCol.y),
    w: S(laid.endCol.width),
    h: S(laid.endCol.height),
    fill: { color: hex(palette.phaseA) },
    line: noLine,
  });
  text(
    copy().endStateHeader,
    X(laid.endCol.x),
    Y(laid.plot.y - 42),
    S(laid.endCol.width),
    S(28),
    { size: fs(11), color: palette.purpose, align: "center", bold: true },
  );

  slide.addShape(pptx.ShapeType.rect, {
    x: X(laid.dpBar.x),
    y: Y(laid.dpBar.y),
    w: S(laid.dpBar.width),
    h: S(laid.dpBar.height),
    fill: { color: hex(palette.dpBar) },
    line: noLine,
  });

  const titleTop = LAYOUT.padY + HEADING.top;
  text(
    laid.titleLines.join("\n"),
    X(0),
    Y(titleTop),
    S(laid.width),
    S(laid.titleLines.length * HEADING.titleLh),
    {
      size: fs(22),
      color: palette.title,
      align: "center",
      bold: true,
    },
  );
  if (laid.purposeLines.length) {
    const purposeTop =
      titleTop + laid.titleLines.length * HEADING.titleLh + HEADING.gap;
    text(
      laid.purposeLines.join("\n"),
      X(40),
      Y(purposeTop),
      S(laid.width - 80),
      S(laid.purposeLines.length * HEADING.purposeLh),
      {
        size: fs(11),
        color: palette.purpose,
        align: "center",
      },
    );
  }

  for (const loe of laid.loes) {
    const x1 = X(loe.x1);
    const y = Y(loe.y);
    // Shaft stops short of the pill or campaign panel so the triangle does not sit on the text.
    const x2 = Math.max(X(loe.x2) - S(12), x1 + 0.05);
    slide.addShape(pptx.ShapeType.line, {
      x: x1,
      y,
      w: x2 - x1,
      h: 0,
      line: {
        color: hex(loe.color),
        width: lw(12),
        endArrowType: "triangle",
      },
    });
    const nameH = Math.max(loe.nameLines.length, 1) * LOE_GUTTER.nameLh;
    text(
      loe.nameLines.join("\n"),
      X(LOE_GUTTER.textX),
      Y(loe.y - nameH / 2),
      S(loeGutterTextWidth()),
      S(nameH),
      {
        size: fs(13),
        color: loe.color,
        bold: true,
        valign: "middle",
      },
    );
    if (loe.purposeLines.length) {
      text(
        loe.purposeLines.join("\n"),
        X(LOE_GUTTER.textX),
        Y(loe.y + nameH / 2 + 2),
        S(loeGutterTextWidth()),
        S(loe.purposeLines.length * LOE_GUTTER.purposeLh),
        { size: fs(9), color: palette.purpose, valign: "top" },
      );
    }
  }

  for (const pill of laid.loeEndStates) {
    const filled = pill.text.trim().length > 0;
    slide.addShape(pptx.ShapeType.line, {
      x: X(pill.x + pill.width),
      y: Y(pill.y + pill.height / 2),
      w: Math.max(X(laid.endState.x) - X(pill.x + pill.width), 0.05),
      h: 0,
      line: {
        color: hex(pill.color),
        width: Math.max(lw(3), 1.15),
      },
    });
    const x = X(pill.x);
    const y = Y(pill.y);
    const w = S(pill.width);
    const h = S(Math.max(pill.height, 28));
    const fill = filled
      ? { color: hex(pill.color), transparency: 84 }
      : { color: hex(palette.bg), transparency: 100 };
    const line = {
      color: hex(pill.color),
      width: 1,
      ...(filled ? {} : { dashType: "dash" as const }),
    };
    if (filled) {
      slide.addText(pill.text.trim(), {
        x,
        y,
        w,
        h,
        shape: pptx.ShapeType.roundRect,
        rectRadius: 0.1,
        fill,
        line,
        fontFace: FONT,
        fontSize: fs(9),
        color: hex(palette.title),
        align: "center",
        valign: "middle",
        bold: true,
        wrap: true,
        fit: "shrink",
        margin: 4,
      });
    } else {
      slide.addShape(pptx.ShapeType.roundRect, {
        x,
        y,
        w,
        h,
        fill,
        line,
        rectRadius: 0.1,
      });
    }
  }

  const byId = new Map(laid.nodes.map((n) => [n.id, n]));

  for (const n of laid.nodes) {
    const isMs = n.kind === "milestone";
    const hw = isMs ? 11 : 13;
    const hh = isMs ? 13 : 13;
    slide.addShape(
      isMs ? pptx.ShapeType.triangle : pptx.ShapeType.diamond,
      {
        x: X(n.x - hw),
        y: Y(n.y - hh),
        w: S(hw * 2),
        h: S(isMs ? 22 : 26),
        fill: { color: hex(isMs ? MILESTONE_FILL : CONDITION_FILL) },
        line: {
          color: hex(isMs ? "#3B0D0D" : "#06243F"),
          width: 1,
        },
        objectName: NODE_NAME(n.id),
      },
    );
  }

  for (const dep of laid.dependencies) {
    const from = byId.get(dep.fromId);
    const to = byId.get(dep.toId);
    if (!from || !to) continue;
    const { startIdx, endIdx } = connectionSites(from, to);
    const a = sitePoint(from, startIdx, X, Y, S);
    const b = sitePoint(to, endIdx, X, Y, S);
    slide.addShape("curvedConnector3" as typeof pptx.ShapeType.line, {
      x: Math.min(a.x, b.x),
      y: Math.min(a.y, b.y),
      w: Math.max(Math.abs(b.x - a.x), 0.02),
      h: Math.max(Math.abs(b.y - a.y), 0.02),
      flipH: b.x < a.x,
      flipV: b.y < a.y,
      line: {
        color: hex(palette.dep),
        width: 1.25,
        dashType: "dash",
      },
      objectName: DEP_NAME(dep.id),
    });
  }

  for (const n of laid.nodes) {
    const { lines, width: boxW, height: boxH } = nodeLabelSize(n.label);
    slide.addShape(pptx.ShapeType.roundRect, {
      x: X(n.x - boxW / 2),
      y: Y(n.y + 14),
      w: S(boxW),
      h: S(boxH),
      fill: fillOf(palette.labelBg),
      line: noLine,
      rectRadius: 0.08,
    });
    text(
      lines.join("\n"),
      X(n.x - boxW / 2),
      Y(n.y + 14),
      S(boxW),
      S(boxH),
      {
        size: fs(10),
        color: palette.label,
        align: "center",
        bold: true,
      },
    );
  }

  for (const dp of laid.dps) {
    slide.addShape(pptx.ShapeType.star5, {
      x: X(dp.x - 13),
      y: Y(dp.y - 13),
      w: S(26),
      h: S(26),
      fill: { color: hex(GATE) },
      line: { color: hex(GATE_LINE), width: 0.9 },
    });
    const glines = wrapLabel(dp.label, 16, 4);
    text(
      glines.join("\n"),
      X(dp.x - 70),
      Y(dp.y + 14),
      S(140),
      S(glines.length * 14 + 4),
      {
        size: fs(10),
        color: palette.label,
        align: "center",
        bold: true,
        valign: "top",
      },
    );
  }

  slide.addShape(pptx.ShapeType.roundRect, {
    x: X(laid.endState.x),
    y: Y(laid.endState.y),
    w: S(laid.endState.width),
    h: S(laid.endState.height),
    fill: { color: hex(endStateColor(laid.endState)), transparency: 84 },
    line: { color: hex(endStateColor(laid.endState)), width: 1.05 },
    rectRadius: 0.12,
  });
  {
    const end = laid.endState;
    const box = endStateTextBox(end);
    const T = END_STATE_TEXT;
    if (end.nameLines.length) {
      text(
        end.nameLines.join("\n"),
        X(end.x + T.padX),
        Y(box.top),
        S(end.width - T.padX * 2),
        S(Math.max(box.nameH, T.nameLh)),
        {
          size: fs(13),
          color: palette.title,
          align: "center",
          bold: true,
          valign: "middle",
        },
      );
    }
    if (end.descriptionLines.length) {
      text(
        end.descriptionLines.join("\n"),
        X(end.x + T.padX),
        Y(box.top + box.nameH + box.gap),
        S(box.descW),
        S(Math.max(box.descH, T.descLh)),
        {
          size: fs(11),
          color: palette.purpose,
          align: "center",
          valign: "top",
        },
      );
    }
  }

  const legendY = Y(laid.height - 44);
  const legendX = X(36);
  slide.addShape(pptx.ShapeType.triangle, {
    x: legendX,
    y: legendY,
    w: S(14),
    h: S(14),
    fill: { color: hex(MILESTONE_FILL) },
    line: noLine,
  });
  text(copy().milestone, legendX + S(18), legendY - S(2), S(70), S(16), {
        size: fs(10),
    color: palette.label,
    bold: true,
  });
  slide.addShape(pptx.ShapeType.diamond, {
    x: legendX + S(92),
    y: legendY,
    w: S(14),
    h: S(14),
    fill: { color: hex(CONDITION_FILL) },
    line: noLine,
  });
  text(copy().condition, legendX + S(110), legendY - S(2), S(80), S(16), {
        size: fs(10),
    color: palette.label,
    bold: true,
  });
  slide.addShape(pptx.ShapeType.star5, {
    x: legendX + S(188),
    y: legendY,
    w: S(14),
    h: S(14),
    fill: { color: hex(GATE) },
    line: { color: hex(GATE_LINE), width: 0.6 },
  });
  text(copy().gate, legendX + S(206), legendY - S(2), S(50), S(16), {
        size: fs(10),
    color: palette.label,
    bold: true,
  });
  slide.addShape(pptx.ShapeType.line, {
    x: legendX + S(248),
    y: legendY + S(7),
    w: S(36),
    h: 0,
    line: {
      color: hex(palette.dep),
      width: 1.4,
      dashType: "dash",
    },
  });
  text(copy().dependency, legendX + S(288), legendY - S(2), S(90), S(16), {
        size: fs(10),
    color: palette.label,
    bold: true,
  });

  if (design.showDetail) {
    addDetailSlides(pptx, design, palette);
  }

  return patchPptxConnectors(pptx, design, laid.nodes);
}

export async function downloadPptx(
  design: OperationalDesign,
  palette: DiagramPalette,
): Promise<void> {
  const buf = await buildPptxArrayBuffer(design, palette);
  downloadBlob(
    new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    }),
    `${slug(design.title)}.pptx`,
  );
}

async function patchPptxConnectors(
  pptx: { write: (props: { outputType: "arraybuffer" }) => Promise<unknown> },
  design: OperationalDesign,
  nodes: Array<{ id: string; x: number; y: number }>,
): Promise<ArrayBuffer> {
  const raw = await pptx.write({ outputType: "arraybuffer" });
  const zip = await JSZip.loadAsync(raw as ArrayBuffer);
  const slidePath =
    Object.keys(zip.files).find((p) => /ppt\/slides\/slide1\.xml$/.test(p)) ??
    Object.keys(zip.files).find((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p));
  if (slidePath) {
    const xml = await zip.file(slidePath)!.async("string");
    zip.file(
      slidePath,
      glueConnectors(xml, design.dependencies, nodes),
    );
  }
  return zip.generateAsync({ type: "arraybuffer" });
}
