import { composeExportSvgMarkup } from "./detailSvg";
import { slug, triggerDownload } from "./storage";
import type { DiagramPalette } from "./theme";
import type { OperationalDesign } from "./types";

function exportMarkup(
  svg: SVGSVGElement,
  design: OperationalDesign,
  palette: DiagramPalette,
): { xml: string; width: number; height: number } {
  return composeExportSvgMarkup(svg, design, palette);
}

export function downloadSvg(
  svg: SVGSVGElement,
  design: OperationalDesign,
  palette: DiagramPalette,
): void {
  const { xml } = exportMarkup(svg, design, palette);
  const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  triggerDownload(blob, slug(design.title) + ".svg");
}

export async function rasteriseSvg(
  xml: string,
  width: number,
  height: number,
  bg: string,
  scale = 2,
): Promise<Blob> {
  const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not create canvas.");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvasToBlob(canvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function downloadPng(
  svg: SVGSVGElement,
  design: OperationalDesign,
  palette: DiagramPalette,
  scale = 2,
): Promise<void> {
  const { xml, width, height } = exportMarkup(svg, design, palette);
  const png = await rasteriseSvg(xml, width, height, palette.bg, scale);
  triggerDownload(png, slug(design.title) + ".png");
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not rasterise the diagram."));
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("PNG export failed."));
    }, "image/png");
  });
}

export function filenameFor(design: OperationalDesign, ext: string): string {
  return `${slug(design.title)}.${ext}`;
}
