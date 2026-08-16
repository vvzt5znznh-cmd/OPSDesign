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

  it("lays out with every workstream reading into the end state", () => {
    const laid = layoutDiagram(SAMPLE_DESIGN);
    expect(laid.loes.length).toBe(SAMPLE_DESIGN.linesOfEffort.length);
    for (const loe of laid.loes) {
      expect(loe.x2).toBe(laid.endState.x);
    }
    expect(laid.dps).toHaveLength(SAMPLE_DESIGN.decisionPoints.length);
  });

  it("round-trips through JSON text", () => {
    const again = parseImportedDesign(sampleDesignJson());
    expect(again.id).toBe(SAMPLE_DESIGN.id);
    expect(again.nodes).toHaveLength(SAMPLE_DESIGN.nodes.length);
  });

  it("puts extra wording only on the end-state panel", () => {
    expect(SAMPLE_DESIGN.endState.description.trim()).not.toBe("");
    for (const n of SAMPLE_DESIGN.nodes) {
      expect(n.description).toBe("");
      expect(n.label.trim()).not.toBe("");
    }
    for (const dp of SAMPLE_DESIGN.decisionPoints) {
      expect(dp.description).toBe("");
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
