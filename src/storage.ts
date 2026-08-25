import { LOE_COLORS, endStateColor, loeEndStatesShown, type DecisionPoint, type DesignNode, type Dependency, type LineOfEffort, type OperationalDesign } from "./types";

const KEY = "opsdesign:current";
const PREVIOUS_KEY = "opsdesign:previous";
const SESSION_KEY = "opsdesign:session";

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
    endState: asString(raw.endState),
  };
}

function migrateDp(raw: Record<string, unknown>): DecisionPoint | null {
  if (typeof raw.id !== "string") return null;
  return {
    id: raw.id,
    label: asString(raw.label, "Decision"),
    afterPhaseId: asString(raw.afterPhaseId),
    placement: raw.placement === "in" ? "in" : "after",
    order: typeof raw.order === "number" ? raw.order : 0,
    description: asString(raw.description),
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

  const phases: OperationalDesign["phases"] = [];
  for (const item of value.phases) {
    if (!isRecord(item) || typeof item.id !== "string") continue;
    phases.push({ id: item.id, name: asString(item.name, "Phase") });
  }
  if (phases.length === 0) return null;

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

  const linesOfEffort = value.linesOfEffort.flatMap((item, i) => {
    if (!isRecord(item)) return [];
    const loe = migrateLoe(item, i);
    return loe ? [loe] : [];
  });
  if (linesOfEffort.length === 0) return null;

  return {
    id: value.id,
    title: value.title,
    purpose: asString(value.purpose),
    endState: {
      name: asString(value.endState.name, "END STATE"),
      description: asString(value.endState.description),
      color: endStateColor({ color: asString(value.endState.color) }),
    },
    phases,
    linesOfEffort,
    nodes,
    dependencies,
    decisionPoints: Array.isArray(value.decisionPoints)
      ? value.decisionPoints.flatMap((item) => {
          if (!isRecord(item)) return [];
          const dp = migrateDp(item);
          return dp ? [dp] : [];
        })
      : [],
    showLoeEndStates: loeEndStatesShown(value),
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

/** Last picture displaced by File → New or Open JSON. Survives leaving the tab. */
export function stashPrevious(design: OperationalDesign): void {
  try {
    localStorage.setItem(PREVIOUS_KEY, JSON.stringify(design));
  } catch {
    /* quota */
  }
}

export function loadPrevious(): OperationalDesign | null {
  try {
    const raw = localStorage.getItem(PREVIOUS_KEY);
    if (!raw) return null;
    return normalizeDesign(JSON.parse(raw));
  } catch {
    return null;
  }
}

export type SessionStacks = {
  undo: OperationalDesign[];
  redo: OperationalDesign[];
};

function designsFromUnknown(value: unknown): OperationalDesign[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const design = normalizeDesign(item);
    return design ? [design] : [];
  });
}

/** Undo/redo for this tab. Survives refresh; clears when the tab is closed. */
export function loadSession(): SessionStacks {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return { undo: [], redo: [] };
    const value = JSON.parse(raw) as { undo?: unknown; redo?: unknown };
    return {
      undo: designsFromUnknown(value.undo),
      redo: designsFromUnknown(value.redo),
    };
  } catch {
    return { undo: [], redo: [] };
  }
}

export function saveSession(undo: OperationalDesign[], redo: OperationalDesign[]): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ undo, redo }));
  } catch {
    /* quota */
  }
}

export function parseImportedDesign(text: string): OperationalDesign {
  const parsed = normalizeDesign(JSON.parse(extractJson(text)));
  if (!parsed) {
    throw new Error("That file is not a valid OPSDesign document.");
  }
  return parsed;
}

/** Accept raw JSON, or the fenced block an LLM often returns. */
export function extractJson(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
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
