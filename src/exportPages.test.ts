import { describe, expect, it } from "vitest";
import { designForDetailPhase, phaseViewDesign } from "./design";
import { detailFigureSvgMarkup } from "./detailSvg";
import { composeDetailPageSvg, exportPageList, pageHeading } from "./exportPages";
import { layoutDiagram } from "./layout";
import { epicFuryTemplate, projectTemplate } from "./templates";
import { DIAGRAM_PALETTES } from "./theme";

describe("phase view pages", () => {
  it("lays each Epic Fury phase as its own picture, not a clip of the wall", () => {
    const design = epicFuryTemplate();
    const wall = layoutDiagram(design);
    expect(design.phases.length).toBeGreaterThan(1);
    for (const phase of design.phases) {
      const picture = phaseViewDesign(design, phase.id)!;
      const laid = layoutDiagram(picture);
      expect(laid.phases).toHaveLength(1);
      expect(laid.phases[0].name).toBe(phase.name);
      expect(
        picture.decisionPoints.every((dp) => dp.placement === "in"),
      ).toBe(true);
      expect(laid.width).toBeLessThan(wall.width);
    }
  });

  it("wraps the notes heading without an ellipsis", () => {
    const design = epicFuryTemplate();
    const heading = pageHeading(
      design.title,
      design.purpose,
      design.phases[0].name,
      900,
    );
    expect(heading.titleLines.join("")).not.toContain("…");
    expect(heading.purposeLines.join("")).not.toContain("…");
    expect(heading.phaseLines.join(" ")).toBe("Shape");
  });

  it("lists overview and phase files, and detail files only when the figure is on", () => {
    const off = projectTemplate();
    const on = { ...off, showDetail: true };
    const offList = exportPageList(off);
    const onList = exportPageList(on);
    expect(offList[0].kind).toBe("overview");
    expect(offList.some((p) => p.kind === "phase")).toBe(true);
    expect(offList.some((p) => p.kind === "detail")).toBe(false);
    expect(onList.some((p) => p.kind === "detail")).toBe(true);
    expect(onList.some((p) => p.filename.includes("detail-discover"))).toBe(
      true,
    );
  });
});

describe("detail phase pages", () => {
  it("keeps one phase of notes and drops the DETAIL explainer", () => {
    const design = { ...epicFuryTemplate(), showDetail: true };
    const shape = design.phases.find((p) => p.name === "Shape")!;
    const seize = design.phases.find((p) => p.name === "Seize initiative")!;
    const slice = designForDetailPhase(design, shape.id);
    expect(slice).toBeTruthy();
    const { markup } = detailFigureSvgMarkup(
      slice!,
      1200,
      DIAGRAM_PALETTES.light,
    );
    expect(markup).toContain("C1: Launch and");
    expect(markup).toContain("target system");
    expect(markup).toContain("DECISION GATES");
    expect(markup).not.toContain("Regime pressure");
    expect(markup).not.toContain("fielded launch");
    expect(markup).not.toContain("Labels match the picture");
    expect(markup).not.toContain(">DETAIL<");
    expect(designForDetailPhase(design, seize.id)?.nodes.some((n) =>
      n.label.includes("DESTROY fielded launch"),
    )).toBe(true);
  });

  it("drops empty workstreams and titles the notes page", () => {
    const design = { ...epicFuryTemplate(), showDetail: true };
    const shape = design.phases.find((p) => p.name === "Shape")!;
    const slice = designForDetailPhase(design, shape.id)!;
    expect(slice.linesOfEffort.some((l) => l.name === "Regime pressure")).toBe(
      false,
    );
    expect(
      slice.linesOfEffort.some((l) => l.name === "Counter-capability"),
    ).toBe(true);
    const page = composeDetailPageSvg(
      slice,
      shape.name,
      DIAGRAM_PALETTES.light,
      design.title,
      design.purpose,
      1200,
    );
    expect(page.xml).toContain("Shape — notes");
    expect(page.xml).toContain("DECISION GATES");
    expect(page.xml).not.toContain("Regime pressure");
  });

  it("omits the explainer from a full detail export too", () => {
    const { markup } = detailFigureSvgMarkup(
      { ...projectTemplate(), showDetail: true },
      1400,
      DIAGRAM_PALETTES.light,
    );
    expect(markup).not.toContain("Labels match the picture");
    expect(markup).not.toContain(">DETAIL<");
    expect(markup).toContain("M1: Problem framed");
  });
});
