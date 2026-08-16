import { LOE_COLORS, type DesignNode, type Dependency, type LineOfEffort, type OperationalDesign } from "./types";
import { blankDesign } from "./templates";

const KEY = "opsdesign:current";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function migrateNode(
  raw: Record<string, unknown>,
  fallbackKind: DesignNode["kind"],
): DesignNode | null {
  if (typeof raw.id !== "string") return null;
  const kind =
    raw.kind === "milestone" || raw.kind === "condition"
      ? raw.kind
      : fallbackKind;
  return {
    id: raw.id,
    kind,
    loeId: asString(raw.loeId),
    phaseId: asString(raw.phaseId),
    label: asString(raw.label),
    description: asString(raw.description),
    order: typeof raw.order === "number" ? raw.order : 0,
  };
}

function migrateLoe(raw: Record<string, unknown>, index: number): LineOfEffort | null {
  if (typeof raw.id !== "string") return null;
  return {
    id: raw.id,
    name: asString(raw.name, `Workstream ${index + 1}`),
    color: asString(raw.color, LOE_COLORS[index % LOE_COLORS.length]),
    purpose: asString(raw.purpose),
  };
}

export function normalizeDesign(value: unknown): OperationalDesign | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || typeof value.title !== "string") {
    return null;
  }
  if (!Array.isArray(value.phases) || !Array.isArray(value.linesOfEffort)) {
    return null;
  }
  if (!isRecord(value.endState) || typeof value.endState.name !== "string") {
    return null;
  }

  const fallbackKind =
    value.nodeKind === "decisive_condition" ? "condition" : "milestone";
  const rawNodes = Array.isArray(value.nodes)
    ? value.nodes
    : Array.isArray(value.conditions)
      ? value.conditions
      : [];
  const nodes: DesignNode[] = [];
  for (const item of rawNodes) {
    if (!isRecord(item)) continue;
    const node = migrateNode(item, fallbackKind);
    if (node) nodes.push(node);
  }

  const dependencies: Dependency[] = [];
  if (Array.isArray(value.dependencies)) {
    for (const item of value.dependencies) {
      if (!isRecord(item)) continue;
      if (
        typeof item.id === "string" &&
        typeof item.fromId === "string" &&
        typeof item.toId === "string"
      ) {
        dependencies.push({
          id: item.id,
          fromId: item.fromId,
          toId: item.toId,
        });
      }
    }
  }

  return {
    id: value.id,
    title: value.title,
    purpose: asString(value.purpose),
    endState: {
      name: asString(value.endState.name, "END STATE"),
      description: asString(value.endState.description),
    },
    phases: value.phases as OperationalDesign["phases"],
    linesOfEffort: value.linesOfEffort.flatMap((item, i) => {
      if (!isRecord(item)) return [];
      const loe = migrateLoe(item, i);
      return loe ? [loe] : [];
    }),
    nodes,
    dependencies,
    decisionPoints: Array.isArray(value.decisionPoints)
      ? (value.decisionPoints as OperationalDesign["decisionPoints"])
      : [],
  };
}

export function loadDesign(): OperationalDesign | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return normalizeDesign(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveDesign(design: OperationalDesign): void {
  localStorage.setItem(KEY, JSON.stringify(design));
}

export function parseImportedDesign(text: string): OperationalDesign {
  const parsed = normalizeDesign(JSON.parse(text));
  if (!parsed) {
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
