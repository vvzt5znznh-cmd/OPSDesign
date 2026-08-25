import { describe, expect, it } from "vitest";
import { detailFigureSvgMarkup, xmlEscape } from "./detailSvg";
import { projectTemplate } from "./templates";
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
    expect(height).toBeGreaterThan(200);
  });

  it("escapes XML in labels", () => {
    expect(xmlEscape(`A & B <C>`)).toBe("A &amp; B &lt;C&gt;");
  });
});
