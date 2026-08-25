import { detailFigureModel, streamPhaseGroups } from "./design";
import { wrapToWidth } from "./layout";
import type { DiagramPalette } from "./theme";
import {
  CONDITION_FILL,
  MILESTONE_FILL,
  type OperationalDesign,
} from "./types";

const GATE = "#2E7D32";
const PAD = 24;
const GAP = 16;
const CARD_PAD = 14;
const RAIL = 5;
const DESC_PX = 6.4;
const META_PX = 5.8;

export function xmlEscape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function t(
  x: number,
  y: number,
  text: string,
  opts: {
    size: number;
    fill: string;
    weight?: number;
    anchor?: "start" | "middle";
  },
): string {
  const anchor = opts.anchor ? ` text-anchor="${opts.anchor}"` : "";
  const weight = opts.weight ? ` font-weight="${opts.weight}"` : "";
  return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-family="Arial, Helvetica, sans-serif" font-size="${opts.size}" fill="${opts.fill}"${weight}${anchor}>${xmlEscape(text)}</text>`;
}

function milestoneMark(x: number, y: number): string {
  return `<path transform="translate(${x},${y})" d="M6 1.2 L11 10.5 H1 Z" fill="${MILESTONE_FILL}"/>`;
}

function conditionMark(x: number, y: number): string {
  return `<path transform="translate(${x},${y})" d="M6 1 L11 6 L6 11 L1 6 Z" fill="${CONDITION_FILL}"/>`;
}

function gateMark(x: number, y: number): string {
  return `<path transform="translate(${x},${y})" d="M6 1.1 L7.4 4.4 L11 4.7 L8.3 7.1 L9.1 10.7 L6 8.8 L2.9 10.7 L3.7 7.1 L1 4.7 L4.6 4.4 Z" fill="${GATE}"/>`;
}

function cardRect(
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
): string {
  return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="8" fill="${fill}"/>`;
}

function itemBlock(
  x: number,
  y: number,
  mark: string,
  label: string,
  meta: string,
  desc: string,
  textW: number,
  palette: DiagramPalette,
): { markup: string; height: number } {
  const parts: string[] = [mark];
  let iy = y + 11;
  parts.push(t(x + 18, iy, label, { size: 13, fill: palette.label, weight: 700 }));
  if (meta) {
    iy += 14;
    parts.push(t(x + 18, iy, meta, { size: 11, fill: palette.purpose }));
  }
  if (desc) {
    const lines = wrapToWidth(desc, textW, DESC_PX, 10_000);
    for (const line of lines) {
      iy += 15;
      parts.push(t(x + 18, iy, line, { size: 12, fill: palette.label }));
    }
  } else if (!meta) {
    iy += 10;
  }
  return { markup: parts.join(""), height: iy - y + 8 };
}

/** SVG markup for the detail list, same grouping as the on-screen figure. */
export function detailFigureSvgMarkup(
  design: OperationalDesign,
  width: number,
  palette: DiagramPalette,
): { markup: string; height: number } {
  const w = Math.max(width, 640);
  const model = detailFigureModel(design);
  const empty =
    model.gates.length === 0 && model.streams.every((s) => s.nodes.length === 0);
  const parts: string[] = [
    `<rect width="${w}" height="__DETAIL_H__" rx="10" fill="${palette.bg}"/>`,
    t(PAD, PAD + 14, "DETAIL", {
      size: 11,
      fill: palette.purpose,
      weight: 700,
    }),
    t(
      PAD,
      PAD + 32,
      "Labels match the picture. Description is optional — it sits here, not on the figures.",
      { size: 12, fill: palette.purpose },
    ),
  ];
  let y = PAD + 48;

  if (empty) {
    parts.push(
      t(
        PAD,
        y + 16,
        "Add milestones, conditions, or gates on the picture. They will list here by workstream.",
        { size: 13, fill: palette.purpose },
      ),
    );
    const height = y + 48;
    return {
      markup: parts.join("").replace("__DETAIL_H__", String(height)),
      height,
    };
  }

  const nCols = Math.max(1, model.streams.length);
  const colW = (w - PAD * 2 - GAP * (nCols - 1)) / nCols;
  const colX = (i: number) => PAD + (i % nCols) * (colW + GAP);
  const phaseNames = design.phases.map((p) => p.name);
  const textInset = CARD_PAD + RAIL + 8;
  const textW = colW - textInset - CARD_PAD;

  if (model.gates.length) {
    parts.push(t(PAD, y + 14, "Gates", { size: 13, fill: palette.phase, weight: 700 }));
    y += 22;
    let rowY = y;
    let rowH = 0;
    const gateBlocks: Array<{
      x: number;
      y: number;
      w: number;
      h: number;
      markup: string;
    }> = [];
    model.gates.forEach((g, i) => {
      const col = i % nCols;
      if (col === 0 && i > 0) {
        y += rowH + 10;
        rowY = y;
        rowH = 0;
      }
      const x = colX(i);
      const meta = `${g.placement === "in" ? "In" : "After"} ${g.phaseName}`.trim();
      const block = itemBlock(
        x + CARD_PAD,
        rowY + CARD_PAD,
        gateMark(x + CARD_PAD, rowY + CARD_PAD),
        g.label,
        meta,
        g.description.trim(),
        colW - CARD_PAD * 2 - 18,
        palette,
      );
      const h = block.height + CARD_PAD;
      gateBlocks.push({ x, y: rowY, w: colW, h, markup: block.markup });
      rowH = Math.max(rowH, h);
    });
    for (const g of gateBlocks) {
      const rowMax = Math.max(
        ...gateBlocks.filter((other) => other.y === g.y).map((other) => other.h),
      );
      parts.push(cardRect(g.x, g.y, g.w, rowMax, palette.phaseA));
      parts.push(g.markup);
    }
    y += rowH + 16;
  }

  type StreamPaint = {
    x: number;
    color: string;
    header: string;
    body: string;
    height: number;
  };
  const paints: StreamPaint[] = model.streams.map((stream, i) => {
    const x = colX(i);
    const header: string[] = [];
    const body: string[] = [];
    let cy = 0;
    header.push(
      t(x + textInset, 16, stream.name, {
        size: 13,
        fill: stream.color,
        weight: 700,
      }),
    );
    cy = 22;
    if (stream.purpose.trim()) {
      const lines = wrapToWidth(stream.purpose, textW, META_PX, 4);
      for (const line of lines) {
        cy += 14;
        header.push(t(x + textInset, cy, line, { size: 12, fill: palette.purpose }));
      }
      cy += 8;
    } else {
      cy += 6;
    }
    if (stream.nodes.length === 0) {
      cy += 16;
      body.push(
        t(x + textInset, cy, "No milestones or conditions.", {
          size: 12,
          fill: palette.purpose,
        }),
      );
    } else {
      for (const group of streamPhaseGroups(stream.nodes, phaseNames)) {
        if (group.name) {
          cy += 16;
          body.push(
            t(x + textInset, cy, group.name.toUpperCase(), {
              size: 10,
              fill: palette.purpose,
              weight: 700,
            }),
          );
          cy += 4;
        }
        for (const node of group.nodes) {
          const mark =
            node.kind === "milestone"
              ? milestoneMark(x + textInset - 2, cy + 6)
              : conditionMark(x + textInset - 2, cy + 6);
          const block = itemBlock(
            x + textInset - 2,
            cy + 4,
            mark,
            node.label,
            "",
            node.description.trim(),
            textW - 16,
            palette,
          );
          body.push(block.markup);
          cy += block.height;
        }
      }
    }
    cy += CARD_PAD;
    return { x, color: stream.color, header: header.join(""), body: body.join(""), height: cy };
  });

  const cardH = Math.max(...paints.map((p) => p.height), 72);
  for (const paint of paints) {
    parts.push(cardRect(paint.x, y, colW, cardH, palette.phaseA));
    parts.push(
      `<rect x="${(paint.x + 8).toFixed(1)}" y="${(y + 12).toFixed(1)}" width="${RAIL}" height="${(cardH - 24).toFixed(1)}" rx="2" fill="${paint.color}"/>`,
    );
    parts.push(`<g transform="translate(0,${y})">${paint.header}${paint.body}</g>`);
  }

  y += cardH + PAD;
  return {
    markup: parts.join("").replace("__DETAIL_H__", String(y)),
    height: y,
  };
}

export function composeExportSvgMarkup(
  picture: SVGSVGElement,
  design: OperationalDesign,
  palette: DiagramPalette,
): { xml: string; width: number; height: number } {
  const clone = picture.cloneNode(true) as SVGSVGElement;
  clone.querySelectorAll("[data-ui='true']").forEach((el) => el.remove());
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  const picW = Number(clone.getAttribute("width")) || 1200;
  const picH = Number(clone.getAttribute("height")) || 700;
  if (!design.showDetail) {
    return {
      xml: new XMLSerializer().serializeToString(clone),
      width: picW,
      height: picH,
    };
  }
  const gap = 16;
  const detail = detailFigureSvgMarkup(design, picW, palette);
  const width = picW;
  const height = picH + gap + detail.height;
  const inner = Array.from(clone.childNodes)
    .map((node) => new XMLSerializer().serializeToString(node))
    .join("");
  const xml =
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<rect width="${width}" height="${height}" fill="${palette.bg}"/>` +
    `<svg x="0" y="0" width="${picW}" height="${picH}" viewBox="0 0 ${picW} ${picH}">${inner}</svg>` +
    `<g transform="translate(0,${picH + gap})">${detail.markup}</g>` +
    `</svg>`;
  return { xml, width, height };
}
