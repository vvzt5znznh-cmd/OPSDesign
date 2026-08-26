import JSZip from "jszip";
import { designForDetailPhase } from "./design";
import { detailFigureSvgMarkup, xmlEscape } from "./detailSvg";
import { rasteriseSvg } from "./export";
import { copy } from "./i18n";
import { HEADING, LAYOUT, layoutDiagram, wrapToWidth, type DiagramLayout } from "./layout";
import { slug, triggerDownload } from "./storage";
import type { DiagramPalette } from "./theme";
import type { OperationalDesign } from "./types";

export const PHASE_BAND_LIFT = 42;
export const AFTER_GATE_OVERHANG = 28;

export type ClipRect = { x: number; y: number; w: number; h: number };

export type PhasePageClips = {
  gutter: ClipRect;
  phase: ClipRect;
  end: ClipRect;
  width: number;
  height: number;
  phaseName: string;
};

export type ExportPageKind = "overview" | "phase" | "detail";

export type ExportPageSpec = {
  kind: ExportPageKind;
  filename: string;
  phaseId?: string;
  phaseName?: string;
};

/** Three clips stitched into one phase page: gutter, this phase, end-state column. */
export function phasePageClips(
  laid: DiagramLayout,
  phaseId: string,
): PhasePageClips | null {
  const phase = laid.phases.find((p) => p.id === phaseId);
  if (!phase) return null;
  const y = laid.plot.y - PHASE_BAND_LIFT;
  const h = Math.max(1, laid.height - y);
  const gutter: ClipRect = { x: 0, y, w: laid.plot.x, h };
  const endX = laid.loeEndCol.width > 0 ? laid.loeEndCol.x : laid.endCol.x;
  const seam = phase.x + phase.width;
  const overhang = Math.max(
    0,
    Math.min(AFTER_GATE_OVERHANG, endX - seam),
  );
  const phaseClip: ClipRect = { x: phase.x, y, w: phase.width + overhang, h };
  const end: ClipRect = { x: endX, y, w: Math.max(1, laid.width - endX), h };
  return {
    gutter,
    phase: phaseClip,
    end,
    width: gutter.w + phaseClip.w + end.w,
    height: h,
    phaseName: phase.name,
  };
}

export function pageHeading(
  title: string,
  purpose: string,
  phaseName: string,
  width: number,
): {
  titleLines: string[];
  purposeLines: string[];
  phaseLines: string[];
  height: number;
} {
  const textW = Math.max(240, width - LAYOUT.padX * 2);
  const titleLines = wrapToWidth(
    title.trim() || copy().untitled,
    textW,
    HEADING.titlePx,
    10_000,
  );
  const purposeLines = purpose.trim()
    ? wrapToWidth(purpose, Math.max(200, textW - 40), HEADING.purposePx, 10_000)
    : [];
  const phaseLines = wrapToWidth(phaseName.trim(), textW, HEADING.purposePx, 10_000);
  const height =
    LAYOUT.padY +
    HEADING.top +
    titleLines.length * HEADING.titleLh +
    (purposeLines.length ? HEADING.gap + purposeLines.length * HEADING.purposeLh : 0) +
    HEADING.gap +
    phaseLines.length * HEADING.purposeLh +
    HEADING.bottom;
  return { titleLines, purposeLines, phaseLines, height };
}

function headingMarkup(
  heading: ReturnType<typeof pageHeading>,
  width: number,
  palette: DiagramPalette,
): string {
  const cx = width / 2;
  const parts: string[] = [];
  heading.titleLines.forEach((line, i) => {
    const y = LAYOUT.padY + HEADING.top + i * HEADING.titleLh + 18;
    parts.push(
      `<text x="${cx.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" fill="${palette.title}">${xmlEscape(line)}</text>`,
    );
  });
  const purposeTop =
    LAYOUT.padY +
    HEADING.top +
    heading.titleLines.length * HEADING.titleLh +
    (heading.purposeLines.length ? HEADING.gap : 0);
  heading.purposeLines.forEach((line, i) => {
    const y = purposeTop + i * HEADING.purposeLh + 11;
    parts.push(
      `<text x="${cx.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="13" fill="${palette.purpose}">${xmlEscape(line)}</text>`,
    );
  });
  const phaseTop =
    purposeTop +
    heading.purposeLines.length * HEADING.purposeLh +
    HEADING.gap;
  heading.phaseLines.forEach((line, i) => {
    const y = phaseTop + i * HEADING.purposeLh + 12;
    parts.push(
      `<text x="${cx.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="600" fill="${palette.phase}">${xmlEscape(line)}</text>`,
    );
  });
  return parts.join("");
}

function nestedClip(clip: ClipRect, destX: number, destY: number, inner: string): string {
  return (
    `<svg x="${destX.toFixed(1)}" y="${destY.toFixed(1)}" width="${clip.w.toFixed(1)}" height="${clip.h.toFixed(1)}" viewBox="${clip.x.toFixed(1)} ${clip.y.toFixed(1)} ${clip.w.toFixed(1)} ${clip.h.toFixed(1)}" overflow="hidden">${inner}</svg>`
  );
}

export function clonePictureInner(picture: SVGSVGElement): string {
  const clone = picture.cloneNode(true) as SVGSVGElement;
  clone.querySelectorAll("[data-ui='true']").forEach((el) => el.remove());
  return Array.from(clone.childNodes)
    .map((node) => new XMLSerializer().serializeToString(node))
    .join("");
}

export function composePhasePageSvg(
  laid: DiagramLayout,
  phaseId: string,
  pictureInner: string,
  palette: DiagramPalette,
  title: string,
  purpose: string,
): { xml: string; width: number; height: number } | null {
  const clips = phasePageClips(laid, phaseId);
  if (!clips) return null;
  const heading = pageHeading(title, purpose, clips.phaseName, clips.width);
  const width = clips.width;
  const destY = heading.height;
  const height = destY + clips.height;
  const xml =
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<rect width="${width}" height="${height}" fill="${palette.bg}"/>` +
    headingMarkup(heading, width, palette) +
    nestedClip(clips.gutter, 0, destY, pictureInner) +
    nestedClip(clips.phase, clips.gutter.w, destY, pictureInner) +
    nestedClip(clips.end, clips.gutter.w + clips.phase.w, destY, pictureInner) +
    `</svg>`;
  return { xml, width, height };
}

export function composeDetailPageSvg(
  design: OperationalDesign,
  phaseName: string,
  palette: DiagramPalette,
  title: string,
  purpose: string,
  width: number,
): { xml: string; width: number; height: number } {
  const heading = pageHeading(title, purpose, copy().notesPage(phaseName), width);
  const detail = detailFigureSvgMarkup(design, width, palette);
  const height = heading.height + detail.height;
  const xml =
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<rect width="${width}" height="${height}" fill="${palette.bg}"/>` +
    headingMarkup(heading, width, palette) +
    `<g transform="translate(0,${heading.height})">${detail.markup}</g>` +
    `</svg>`;
  return { xml, width, height };
}

export function exportPageList(design: OperationalDesign): ExportPageSpec[] {
  const base = slug(design.title);
  const pages: ExportPageSpec[] = [
    { kind: "overview", filename: `${base}-overview.png` },
  ];
  for (const phase of design.phases) {
    pages.push({
      kind: "phase",
      filename: `${base}-${slug(phase.name)}.png`,
      phaseId: phase.id,
      phaseName: phase.name,
    });
    if (design.showDetail && designForDetailPhase(design, phase.id)) {
      pages.push({
        kind: "detail",
        filename: `${base}-detail-${slug(phase.name)}.png`,
        phaseId: phase.id,
        phaseName: phase.name,
      });
    }
  }
  return pages;
}

/** PNG zip: overview + one picture per phase, and detail pages when the figure is on. */
export async function downloadPages(
  picture: SVGSVGElement,
  design: OperationalDesign,
  palette: DiagramPalette,
  scale = 2,
): Promise<void> {
  const laid = layoutDiagram(design);
  const inner = clonePictureInner(picture);
  const zip = new JSZip();
  const base = slug(design.title);

  const overview = pictureOnlyMarkup(picture);
  zip.file(
    `${base}-overview.png`,
    await rasteriseSvg(overview.xml, overview.width, overview.height, palette.bg, scale),
  );

  for (const phase of design.phases) {
    const page = composePhasePageSvg(
      laid,
      phase.id,
      inner,
      palette,
      design.title,
      design.purpose,
    );
    if (!page) continue;
    zip.file(
      `${base}-${slug(phase.name)}.png`,
      await rasteriseSvg(page.xml, page.width, page.height, palette.bg, scale),
    );
    if (!design.showDetail) continue;
    const slice = designForDetailPhase(design, phase.id);
    if (!slice) continue;
    const width = Math.max(page.width, 900);
    const detail = composeDetailPageSvg(
      slice,
      phase.name,
      palette,
      design.title,
      design.purpose,
      width,
    );
    zip.file(
      `${base}-detail-${slug(phase.name)}.png`,
      await rasteriseSvg(detail.xml, width, detail.height, palette.bg, scale),
    );
  }

  const blob = await zip.generateAsync({ type: "blob" });
  triggerDownload(blob, `${base}-pages.zip`);
}

function pictureOnlyMarkup(
  picture: SVGSVGElement,
): { xml: string; width: number; height: number } {
  const clone = picture.cloneNode(true) as SVGSVGElement;
  clone.querySelectorAll("[data-ui='true']").forEach((el) => el.remove());
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  const width = Number(clone.getAttribute("width")) || 1200;
  const height = Number(clone.getAttribute("height")) || 700;
  return {
    xml: new XMLSerializer().serializeToString(clone),
    width,
    height,
  };
}
