import { detailFigureModel } from "./design";
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
const COL_MIN = 200;
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
  iy += 4;
  if (meta) {
    iy += 14;
    parts.push(t(x + 18, iy, meta, { size: 11, fill: palette.purpose }));
  }
  if (desc) {
    const lines = wrapToWidth(desc, textW, DESC_PX, 8);
    for (const line of lines) {
      iy += 15;
      parts.push(t(x + 18, iy, line, { size: 12, fill: palette.label }));
    }
  }
  return { markup: parts.join(""), height: iy - y + 10 };
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

  if (model.gates.length) {
    parts.push(t(PAD, y + 14, "Gates", { size: 13, fill: palette.phase, weight: 700 }));
    y += 22;
    const cols = Math.max(1, Math.min(4, Math.floor((w - PAD * 2) / COL_MIN)));
    const colW = (w - PAD * 2 - GAP * (cols - 1)) / cols;
    const textW = colW - 22;
    let rowY = y;
    let rowH = 0;
    model.gates.forEach((g, i) => {
      const col = i % cols;
      if (col === 0 && i > 0) {
        y += rowH;
        rowY = y;
        rowH = 0;
      }
      const x = PAD + col * (colW + GAP);
      const meta = `${g.placement === "in" ? "In" : "After"} ${g.phaseName}`.trim();
      const block = itemBlock(
        x,
        rowY,
        gateMark(x, rowY),
        g.label,
        meta,
        g.description.trim(),
        textW,
        palette,
      );
      parts.push(block.markup);
      rowH = Math.max(rowH, block.height);
    });
    y += rowH + 10;
  }

  const n = Math.max(1, model.streams.length);
  const colW = (w - PAD * 2 - GAP * (n - 1)) / n;
  let streamsH = 0;
  model.streams.forEach((stream, i) => {
    const x = PAD + i * (colW + GAP);
    let cy = y;
    parts.push(
      `<rect x="${x}" y="${cy + 3}" width="8" height="8" rx="2" fill="${stream.color}"/>`,
    );
    parts.push(
      t(x + 14, cy + 12, stream.name, {
        size: 13,
        fill: stream.color,
        weight: 700,
      }),
    );
    cy += 18;
    if (stream.purpose.trim()) {
      const lines = wrapToWidth(stream.purpose, colW - 8, META_PX, 4);
      for (const line of lines) {
        cy += 14;
        parts.push(t(x, cy, line, { size: 12, fill: palette.purpose }));
      }
      cy += 6;
    }
    if (stream.nodes.length === 0) {
      cy += 16;
      parts.push(
        t(x, cy, "No milestones or conditions.", {
          size: 12,
          fill: palette.purpose,
        }),
      );
    }
    for (const node of stream.nodes) {
      const mark =
        node.kind === "milestone"
          ? milestoneMark(x, cy + 2)
          : conditionMark(x, cy + 2);
      const block = itemBlock(
        x,
        cy,
        mark,
        node.label,
        node.phaseName,
        node.description.trim(),
        colW - 22,
        palette,
      );
      parts.push(block.markup);
      cy += block.height;
    }
    streamsH = Math.max(streamsH, cy - y);
  });
  y += streamsH + PAD;
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
