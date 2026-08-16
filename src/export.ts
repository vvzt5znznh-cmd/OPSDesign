import { slug, triggerDownload } from "./storage";
import type { OperationalDesign } from "./types";

function inlineClone(svg: SVGSVGElement): SVGSVGElement {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.querySelectorAll("[data-ui='true']").forEach((el) => el.remove());
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  return clone;
}

export function downloadSvg(svg: SVGSVGElement, title: string): void {
  const clone = inlineClone(svg);
  const xml = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  triggerDownload(blob, slug(title) + ".svg");
}

export async function downloadPng(
  svg: SVGSVGElement,
  title: string,
  scale = 2,
  backdrop = "#ffffff",
): Promise<void> {
  const clone = inlineClone(svg);
  const width = Number(clone.getAttribute("width")) || 1200;
  const height = Number(clone.getAttribute("height")) || 700;
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  const xml = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not create canvas.");
    ctx.fillStyle = backdrop;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const png = await canvasToBlob(canvas);
    triggerDownload(png, slug(title) + ".png");
  } finally {
    URL.revokeObjectURL(url);
  }
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
