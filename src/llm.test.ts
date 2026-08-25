import { describe, expect, it } from "vitest";
import {
  LLM_PROMPT,
  SAMPLE_DESIGN,
  llmPromptWithSample,
  sampleDesignJson,
} from "./llm";
import { layoutDiagram } from "./layout";
import { extractJson, normalizeDesign, parseImportedDesign } from "./storage";
import { END_STATE_DEFAULT_COLOR } from "./types";

describe("LLM sample design", () => {
  it("is a valid OPSDesign document", () => {
    const parsed = normalizeDesign(SAMPLE_DESIGN);
    expect(parsed?.title).toBe(SAMPLE_DESIGN.title);
    expect(parsed?.phases.length).toBeGreaterThan(0);
    expect(parsed?.linesOfEffort.length).toBeGreaterThan(0);
    expect(parsed?.endState.color).toBe(SAMPLE_DESIGN.endState.color);
  });

  it("fills the quiet default colour when a file omits it", () => {
    const raw = JSON.parse(sampleDesignJson()) as Record<string, unknown>;
    raw.endState = { ...(raw.endState as object), color: undefined };
    const parsed = normalizeDesign(raw);
    expect(parsed?.endState.color).toBe(END_STATE_DEFAULT_COLOR);
  });

  it("fills an empty workstream end state when a file omits it", () => {
    const raw = JSON.parse(sampleDesignJson()) as Record<string, unknown>;
    raw.linesOfEffort = (raw.linesOfEffort as object[]).map((item) => {
      const next = { ...item } as Record<string, unknown>;
      delete next.endState;
      return next;
    });
    const parsed = normalizeDesign(raw);
    expect(parsed).not.toBeNull();
    for (const loe of parsed!.linesOfEffort) {
      expect(loe.endState).toBe("");
    }
  });

  it("keeps workstream end-state pills on when a file omits the toggle", () => {
    const raw = JSON.parse(sampleDesignJson()) as Record<string, unknown>;
    delete raw.showLoeEndStates;
    const parsed = normalizeDesign(raw);
    expect(parsed?.showLoeEndStates).toBe(true);
  });

  it("keeps the detail figure off when a file omits the toggle", () => {
    const raw = JSON.parse(sampleDesignJson()) as Record<string, unknown>;
    delete raw.showDetail;
    const parsed = normalizeDesign(raw);
    expect(parsed?.showDetail).toBe(false);
  });

  it("honours the detail figure turned on in a file", () => {
    const raw = JSON.parse(sampleDesignJson()) as Record<string, unknown>;
    raw.showDetail = true;
    const parsed = normalizeDesign(raw);
    expect(parsed?.showDetail).toBe(true);
  });

  it("uses ids that all resolve", () => {
    const phaseIds = new Set(SAMPLE_DESIGN.phases.map((p) => p.id));
    const loeIds = new Set(SAMPLE_DESIGN.linesOfEffort.map((l) => l.id));
    const nodeIds = new Set(SAMPLE_DESIGN.nodes.map((n) => n.id));
    for (const n of SAMPLE_DESIGN.nodes) {
      expect(phaseIds.has(n.phaseId)).toBe(true);
      expect(loeIds.has(n.loeId)).toBe(true);
    }
    for (const d of SAMPLE_DESIGN.dependencies) {
      expect(nodeIds.has(d.fromId)).toBe(true);
      expect(nodeIds.has(d.toId)).toBe(true);
    }
    for (const dp of SAMPLE_DESIGN.decisionPoints) {
      expect(phaseIds.has(dp.afterPhaseId)).toBe(true);
    }
  });

  it("lays out with every workstream reading into the campaign end state", () => {
    const laid = layoutDiagram(SAMPLE_DESIGN);
    expect(laid.loes.length).toBe(SAMPLE_DESIGN.linesOfEffort.length);
    expect(laid.loeEndStates).toHaveLength(SAMPLE_DESIGN.linesOfEffort.length);
    for (const loe of laid.loes) {
      const pill = laid.loeEndStates.find((p) => p.id === loe.id)!;
      expect(loe.x2).toBe(pill.x);
      expect(pill.lines.length).toBeGreaterThan(0);
      expect(pill.x + pill.width).toBeLessThan(laid.endState.x);
    }
    expect(laid.dps).toHaveLength(SAMPLE_DESIGN.decisionPoints.length);
  });

  it("round-trips through JSON text", () => {
    const again = parseImportedDesign(sampleDesignJson());
    expect(again.id).toBe(SAMPLE_DESIGN.id);
    expect(again.nodes).toHaveLength(SAMPLE_DESIGN.nodes.length);
  });

  it("puts extra wording on end states and in the detail list, not on figure labels", () => {
    expect(SAMPLE_DESIGN.endState.description.trim()).not.toBe("");
    for (const loe of SAMPLE_DESIGN.linesOfEffort) {
      expect(loe.endState.trim()).not.toBe("");
    }
    for (const n of SAMPLE_DESIGN.nodes) {
      expect(n.description.trim()).not.toBe("");
      expect(n.label.trim()).not.toBe("");
      expect(n.label.includes(n.description)).toBe(false);
    }
    for (const dp of SAMPLE_DESIGN.decisionPoints) {
      expect(dp.description.trim()).not.toBe("");
      expect(dp.label.trim()).not.toBe("");
    }
  });
});

describe("LLM prompt", () => {
  it("teaches the schema and includes the sample", () => {
    const text = llmPromptWithSample();
    for (const token of [
      "endState",
      "linesOfEffort",
      "decisionPoints",
      "milestone",
      "condition",
      "placement",
      "op-clinic-booking",
      "showLoeEndStates",
      "showDetail",
    ]) {
      expect(text).toContain(token);
    }
    expect(LLM_PROMPT).toContain("Output **only** a single JSON object");
  });
});

describe("extractJson", () => {
  it("unwraps markdown fences and leading chatter", () => {
    const inner = sampleDesignJson().trim();
    expect(extractJson(`Here you go:\n\`\`\`json\n${inner}\n\`\`\`\n`)).toBe(
      inner,
    );
    expect(extractJson(`Sure.\n${inner}\nThanks`)).toBe(inner);
    const opened = parseImportedDesign(`\`\`\`json\n${inner}\n\`\`\``);
    expect(opened.title).toBe(SAMPLE_DESIGN.title);
  });
});
