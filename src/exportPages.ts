import JSZip from "jszip";
import { designForDetailPhase, phaseViewDesign } from "./design";
import { detailFigureSvgMarkup, xmlEscape } from "./detailSvg";
import { rasteriseSvg } from "./export";
import { copy } from "./i18n";
import { HEADING, LAYOUT, wrapToWidth } from "./layout";
import { renderPhaseViewSvg, serializePictureSvg } from "./phaseViewRender";
import { slug, triggerDownload } from "./storage";
import { PAPER_PALETTE, recolorDiagramMarkup, type DiagramPalette } from "./theme";
import type { OperationalDesign } from "./types";

export type ExportPageKind = "overview" | "phase" | "detail";

export type ExportPageSpec = {
  kind: ExportPageKind;
  filename: string;
  phaseId?: string;
  phaseName?: string;
};

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

/** PNG zip: wall overview + one re-laid phase picture, and notes when Detail is on. */
export async function downloadPages(
  picture: SVGSVGElement,
  design: OperationalDesign,
  palette: DiagramPalette,
  scale = 2,
): Promise<void> {
  const paper = PAPER_PALETTE;
  const zip = new JSZip();
  const base = slug(design.title);

  const overview = serializePictureSvg(picture);
  zip.file(
    `${base}-overview.png`,
    await rasteriseSvg(
      recolorDiagramMarkup(overview.xml, palette, paper),
      overview.width,
      overview.height,
      paper.bg,
      scale,
    ),
  );

  for (const phase of design.phases) {
    const slice = phaseViewDesign(design, phase.id);
    if (!slice) continue;
    const page = renderPhaseViewSvg(slice, { showCampaignEnd: true }, paper);
    zip.file(
      `${base}-${slug(phase.name)}.png`,
      await rasteriseSvg(page.xml, page.width, page.height, paper.bg, scale),
    );
    if (!design.showDetail) continue;
    const notes = designForDetailPhase(design, phase.id);
    if (!notes) continue;
    const width = Math.max(page.width, 900);
    const detail = composeDetailPageSvg(
      notes,
      phase.name,
      paper,
      design.title,
      design.purpose,
      width,
    );
    zip.file(
      `${base}-detail-${slug(phase.name)}.png`,
      await rasteriseSvg(detail.xml, width, detail.height, paper.bg, scale),
    );
  }

  const blob = await zip.generateAsync({ type: "blob" });
  triggerDownload(blob, `${base}-pages.zip`);
}
