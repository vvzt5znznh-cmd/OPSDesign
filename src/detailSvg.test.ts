import { describe, expect, it } from "vitest";
import { detailFigureSvgMarkup, xmlEscape } from "./detailSvg";
import { blankDesign, militaryTemplate, projectTemplate } from "./templates";
import { DIAGRAM_PALETTES } from "./theme";

describe("detail figure SVG export", () => {
  it("lists gates and workstream items", () => {
    const { markup, height } = detailFigureSvgMarkup(
      { ...projectTemplate(), showDetail: true },
      1400,
      DIAGRAM_PALETTES.light,
    );
    expect(markup).toContain("M1: Problem framed");
    expect(markup).toContain("Worth defining?");
    expect(markup).toContain("Service");
    expect(markup).toContain("Assurance");
    expect(markup).toContain("Adoption");
    expect(markup).toContain("DISCOVER");
    expect(markup).toContain("After Discover");
    expect(markup).toContain("cannot finish an application");
    expect(markup).toContain('rx="8"');
    expect(height).toBeGreaterThan(200);
  });

  it("gives starter samples supporting descriptions, and leaves blank empty", () => {
    for (const make of [projectTemplate, militaryTemplate]) {
      const d = make();
      expect(d.nodes.every((n) => n.description.trim().length > 0)).toBe(true);
      expect(
        d.decisionPoints.every((g) => g.description.trim().length > 0),
      ).toBe(true);
    }
    expect(
      blankDesign().decisionPoints.every((g) => g.description === ""),
    ).toBe(true);
  });

  it("escapes XML in labels", () => {
    expect(xmlEscape(`A & B <C>`)).toBe("A &amp; B &lt;C&gt;");
  });
});
