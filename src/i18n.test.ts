import { describe, expect, it } from "vitest";
import { copy, type Copy } from "./i18n";

describe("language copy", () => {
  it("keeps Norwegian terms the user named", () => {
    const nb = copy("nb");
    expect(nb.endState).toBe("Sluttilstand");
    expect(nb.endStateHeader).toBe("SLUTTILSTAND");
    expect(nb.milestone).toBe("Milepæl");
    expect(nb.condition).toBe("Betingelse");
    expect(nb.gate).toBe("Port");
    expect(nb.workstream).toBe("Arbeidsstrøm");
    expect(nb.phase).toBe("Fase");
    expect(nb.decisionGates).toBe("Beslutningsporter");
  });

  it("has the same keys in English and Norwegian", () => {
    const en = copy("en");
    const nb = copy("nb");
    const keys = Object.keys(en) as Array<keyof Copy>;
    expect(keys.length).toBeGreaterThan(40);
    for (const key of keys) {
      expect(nb[key], key).toBeDefined();
      if (typeof en[key] === "string") {
        expect(String(nb[key]).length, key).toBeGreaterThan(0);
      }
    }
  });

  it("names new picture parts in the active language", () => {
    expect(copy("en").phaseN(3)).toBe("Phase 3");
    expect(copy("nb").phaseN(3)).toBe("Fase 3");
    expect(copy("nb").notesPage("Form")).toBe("Form — notater");
    expect(copy("en").exportPptx).toMatch(/briefing/i);
    expect(copy("en").helpFromTitle).toBe("From this picture");
    expect(copy("nb").helpFromTitle).toBe("Fra dette bildet");
  });
});
