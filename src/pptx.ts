import { layoutDiagram, LAYOUT, END_STATE_TEXT } from "./layout";
import { slug } from "./storage";
import type { DiagramPalette } from "./theme";
import {
  CONDITION_FILL,
  MILESTONE_FILL,
  type OperationalDesign,
} from "./types";
import { wrapLabel } from "./wrap";

const FONT = "Arial";
const GATE = "#2E7D32";
const GATE_LINE = "#1B5E20";
const END_FILL = "#1A365D";
const END_LINE = "#2C5282";

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

function speakerNotes(design: OperationalDesign): string {
  const lines: string[] = [
    "OPSDesign briefing notes — not drawn on the slide.",
    "Delete these notes before you share the file if they should stay off the deck.",
    "",
  ];
  if (design.purpose.trim()) {
    lines.push(`Purpose: ${design.purpose.trim()}`, "");
  }
  lines.push(`End state: ${design.endState.name}`);
  if (design.endState.description.trim()) {
    lines.push(design.endState.description.trim());
  }
  lines.push("");
  if (design.decisionPoints.length) {
    lines.push("Gates");
    for (const dp of design.decisionPoints) {
      const phase =
        design.phases.find((p) => p.id === dp.afterPhaseId)?.name ?? "";
      const where = dp.placement === "in" ? "in" : "after";
      lines.push(
        `- ${dp.label}${phase ? ` (${where} ${phase})` : ""}`,
      );
      if (dp.description.trim()) lines.push(`  ${dp.description.trim()}`);
    }
    lines.push("");
  }
  const described = design.nodes.filter((n) => n.description.trim());
  if (described.length) {
    lines.push("Detail (from the inspector — not on the picture)");
    for (const n of described) {
      lines.push(`- ${n.label}: ${n.description.trim()}`);
    }
  }
  return lines.join("\n");
}

export async function downloadPptx(
  design: OperationalDesign,
  palette: DiagramPalette,
): Promise<void> {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const laid = layoutDiagram(design);
  const pptx = new PptxGenJS();
  pptx.title = design.title;
  pptx.author = "OPSDesign";
  pptx.subject = design.purpose.trim() || "Operational design";

  const aspect = laid.width / Math.max(laid.height, 1);
  let slideW = 13.333;
  let slideH = slideW / aspect;
  if (slideH > 7.5) {
    slideH = 7.5;
    slideW = Math.min(20, slideH * aspect);
  }
  if (slideH < 5.4) {
    slideH = 5.4;
    slideW = Math.max(slideW, slideH * aspect);
  }

  pptx.defineLayout({ name: "OPSDesign", width: slideW, height: slideH });
  pptx.layout = "OPSDesign";
  const slide = pptx.addSlide();
  slide.background = { color: hex(palette.bg) };
  slide.addNotes(speakerNotes(design));

  const margin = 0.28;
  const scale = Math.min(
    (slideW - margin * 2) / laid.width,
    (slideH - margin * 2) / laid.height,
  );
  const ox = (slideW - laid.width * scale) / 2;
  const oy = (slideH - laid.height * scale) / 2;
  const X = (px: number) => ox + px * scale;
  const Y = (px: number) => oy + px * scale;
  const S = (px: number) => Math.max(px * scale, 0.04);
  const fs = (px: number, min = 8) =>
    Math.max(min, Math.round(px * scale * 72 * 10) / 10);
  const lw = (px: number) => Math.max(0.75, px * scale * 72);

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
        size: fs(14, 10),
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
    "END STATE",
    X(laid.endCol.x),
    Y(laid.plot.y - 42),
    S(laid.endCol.width),
    S(28),
    { size: fs(11, 9), color: palette.purpose, align: "center", bold: true },
  );

  slide.addShape(pptx.ShapeType.rect, {
    x: X(laid.dpBar.x),
    y: Y(laid.dpBar.y),
    w: S(laid.dpBar.width),
    h: S(laid.dpBar.height),
    fill: { color: hex(palette.dpBar) },
    line: noLine,
  });

  const titleY = design.purpose.trim() ? 18 : 24;
  text(design.title, X(0), Y(titleY), S(laid.width), S(28), {
    size: fs(22, 14),
    color: palette.title,
    align: "center",
    bold: true,
  });
  if (design.purpose.trim()) {
    const purpose =
      design.purpose.length > 120
        ? `${design.purpose.slice(0, 117)}…`
        : design.purpose.trim();
    text(purpose, X(40), Y(46), S(laid.width - 80), S(18), {
      size: fs(11, 9),
      color: palette.purpose,
      align: "center",
    });
  }

  for (const loe of laid.loes) {
    const x1 = X(loe.x1);
    const x2 = X(loe.x2);
    const y = Y(loe.y);
    slide.addShape(pptx.ShapeType.line, {
      x: x1,
      y,
      w: Math.max(x2 - x1, 0.05),
      h: 0,
      line: {
        color: hex(loe.color),
        width: lw(12),
        endArrowType: "triangle",
      },
    });
    text(loe.name, X(16), Y(loe.y - 10), S(LAYOUT.leftGutter - 24), S(18), {
      size: fs(13, 10),
      color: loe.color,
      bold: true,
      valign: "middle",
    });
    if (loe.purpose.trim()) {
      text(
        wrapLabel(loe.purpose.trim(), 24, 2).join("\n"),
        X(16),
        Y(loe.y + 8),
        S(LAYOUT.leftGutter - 24),
        S(24),
        { size: fs(9, 8), color: palette.purpose, valign: "top" },
      );
    }
  }

  const byId = new Map(laid.nodes.map((n) => [n.id, n]));
  for (const dep of laid.dependencies) {
    const from = byId.get(dep.fromId);
    const to = byId.get(dep.toId);
    if (!from || !to) continue;
    const a = { x: X(from.x), y: Y(from.y) };
    const b = { x: X(to.x), y: Y(to.y) };
    const dx = b.x - a.x;
    const pad = 0.1;
    let pts: Array<Record<string, unknown>>;
    let extras: { x: number; y: number }[] = [a, b];
    if (Math.abs(from.y - to.y) < 6) {
      const bulge = (dx >= 0 ? -1 : 1) * S(30);
      const mx = (a.x + b.x) / 2;
      const cy = a.y + bulge;
      extras = [a, b, { x: mx, y: cy }];
      pts = [
        { x: a.x, y: a.y, moveTo: true },
        {
          x: b.x,
          y: b.y,
          curve: { type: "quadratic", x1: mx, y1: cy },
        },
      ];
    } else {
      const mx = (a.x + b.x) / 2;
      extras = [a, b, { x: mx, y: a.y }, { x: mx, y: b.y }];
      pts = [
        { x: a.x, y: a.y, moveTo: true },
        {
          x: b.x,
          y: b.y,
          curve: {
            type: "cubic",
            x1: mx,
            y1: a.y,
            x2: mx,
            y2: b.y,
          },
        },
      ];
    }
    const xs = extras.map((p) => p.x);
    const ys = extras.map((p) => p.y);
    const bx = Math.min(...xs) - pad;
    const by = Math.min(...ys) - pad;
    const bw = Math.max(Math.max(...xs) - Math.min(...xs) + pad * 2, 0.08);
    const bh = Math.max(Math.max(...ys) - Math.min(...ys) + pad * 2, 0.08);
    const rel = pts.map((p) => {
      const next: Record<string, unknown> = {
        ...p,
        x: (p.x as number) - bx,
        y: (p.y as number) - by,
      };
      if (p.curve && typeof p.curve === "object") {
        const c = p.curve as {
          type: string;
          x1: number;
          y1: number;
          x2?: number;
          y2?: number;
        };
        next.curve = {
          type: c.type,
          x1: c.x1 - bx,
          y1: c.y1 - by,
          ...(c.x2 != null ? { x2: c.x2 - bx, y2: c.y2! - by } : {}),
        };
      }
      return next;
    });
    slide.addShape("custGeom" as typeof pptx.ShapeType.rect, {
      x: bx,
      y: by,
      w: bw,
      h: bh,
      fill: { color: hex(palette.bg), transparency: 100 },
      line: {
        color: hex(palette.dep),
        width: 1.25,
        dashType: "dash",
        endArrowType: "triangle",
      },
      points: rel as never,
    });
  }

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
      },
    );
    const lines = wrapLabel(n.label);
    const maxLen = Math.max(...lines.map((l) => l.length), 4);
    const boxW = Math.min(140, Math.max(48, maxLen * 6.2 + 10));
    const boxH = lines.length * 12 + 6;
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
        size: fs(10, 8),
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
    const glines = wrapLabel(dp.label, 14, 2);
    text(
      glines.join("\n"),
      X(dp.x - 70),
      Y(dp.y + 14),
      S(140),
      S(glines.length * 14 + 4),
      {
        size: fs(10, 8),
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
    fill: { color: hex(END_FILL) },
    line: { color: hex(END_LINE), width: 1.15 },
    rectRadius: 0.12,
  });
  {
    const end = laid.endState;
    const T = END_STATE_TEXT;
    const nameH = end.nameLines.length * T.nameLh;
    const descH = end.descriptionLines.length * T.descLh;
    const gap =
      end.nameLines.length && end.descriptionLines.length ? T.gap : 0;
    const top = end.y + (end.height - (nameH + gap + descH)) / 2;
    if (end.nameLines.length) {
      text(
        end.nameLines.join("\n"),
        X(end.x + 8),
        Y(top),
        S(end.width - 16),
        S(Math.max(nameH, T.nameLh)),
        {
          size: fs(13, 11),
          color: "#FFFFFF",
          align: "center",
          bold: true,
          valign: "middle",
        },
      );
    }
    if (end.descriptionLines.length) {
      text(
        end.descriptionLines.join("\n"),
        X(end.x + 8),
        Y(top + nameH + gap),
        S(end.width - 16),
        S(Math.max(descH, T.descLh)),
        {
          size: fs(11, 9),
          color: "D6E4F0",
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
  text("Milestone", legendX + S(18), legendY - S(2), S(70), S(16), {
    size: fs(10, 8),
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
  text("Condition", legendX + S(110), legendY - S(2), S(70), S(16), {
    size: fs(10, 8),
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
  text("Gate", legendX + S(206), legendY - S(2), S(40), S(16), {
    size: fs(10, 8),
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
  text("Dependency", legendX + S(288), legendY - S(2), S(80), S(16), {
    size: fs(10, 8),
    color: palette.label,
    bold: true,
  });

  await pptx.writeFile({ fileName: `${slug(design.title)}.pptx` });
}
