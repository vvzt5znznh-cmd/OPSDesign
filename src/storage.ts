import type { OperationalDesign } from "./types";
import { blankDesign } from "./templates";

const KEY = "opsdesign:current";

function isDesign(value: unknown): value is OperationalDesign {
  if (!value || typeof value !== "object") return false;
  const d = value as OperationalDesign;
  return (
    typeof d.id === "string" &&
    typeof d.title === "string" &&
    Array.isArray(d.phases) &&
    Array.isArray(d.linesOfEffort) &&
    Array.isArray(d.conditions) &&
    Array.isArray(d.decisionPoints) &&
    (d.nodeKind === "milestone" || d.nodeKind === "decisive_condition") &&
    d.endState != null &&
    typeof d.endState.name === "string"
  );
}

export function loadDesign(): OperationalDesign | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isDesign(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveDesign(design: OperationalDesign): void {
  localStorage.setItem(KEY, JSON.stringify(design));
}

export function clearSavedDesign(): void {
  localStorage.removeItem(KEY);
}

export function parseImportedDesign(text: string): OperationalDesign {
  const parsed: unknown = JSON.parse(text);
  if (!isDesign(parsed)) {
    throw new Error("That file is not a valid OPSDesign document.");
  }
  return parsed;
}

export function downloadJson(design: OperationalDesign): void {
  const blob = new Blob([JSON.stringify(design, null, 2)], {
    type: "application/json",
  });
  triggerDownload(blob, slug(design.title) + ".json");
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function slug(title: string): string {
  const s = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return s || "opsdesign";
}

export function ensureDesign(): OperationalDesign {
  return loadDesign() ?? blankDesign();
}
