import { describe, expect, it } from "vitest";
import { designForDetailPhase } from "./design";
import { detailFigureSvgMarkup } from "./detailSvg";
import {
  composeDetailPageSvg,
  composePhasePageSvg,
  exportPageList,
  pageHeading,
  phasePageClips,
} from "./exportPages";
import { layoutDiagram } from "./layout";
import { epicFuryTemplate, projectTemplate } from "./templates";
import { DIAGRAM_PALETTES, recolorDiagramMarkup } from "./theme";

describe("phase page clips", () => {
  it("makes each Epic Fury phase page narrower than the full picture", () => {
    const design = epicFuryTemplate();
    const laid = layoutDiagram(design);
    expect(design.phases.length).toBeGreaterThan(1);
    for (const phase of design.phases) {
      const clips = phasePageClips(laid, phase.id);
      expect(clips).toBeTruthy();
      expect(clips!.gutter.w).toBeGreaterThan(100);
      expect(clips!.phase.w).toBeGreaterThan(100);
      expect(clips!.end.w).toBeGreaterThan(100);
      expect(clips!.gutter.w + clips!.phase.w + clips!.end.w).toBeCloseTo(
        clips!.width,
        5,
      );
      expect(clips!.width).toBeLessThan(laid.width - 80);
      expect(clips!.phase.x).toBe(laid.phases.find((p) => p.id === phase.id)!.x);
      expect(clips!.end.x).toBeGreaterThanOrEqual(
        clips!.phase.x + clips!.phase.w - 0.01,
      );
    }
  });

  it("wraps the slice heading without an ellipsis", () => {
    const design = epicFuryTemplate();
    const laid = layoutDiagram(design);
    const clips = phasePageClips(laid, design.phases[0].id)!;
    const heading = pageHeading(
      design.title,
      design.purpose,
      design.phases[0].name,
      clips.width,
    );
    expect(heading.titleLines.join("")).not.toContain("…");
    expect(heading.purposeLines.join("")).not.toContain("…");
    expect(heading.phaseLines.join(" ")).toBe("Shape");
    const page = composePhasePageSvg(
      laid,
      design.phases[0].id,
      `<rect width="1" height="1"/>`,
      DIAGRAM_PALETTES.light,
      design.title,
      design.purpose,
    );
    expect(page).toBeTruthy();
    expect(page!.xml).toContain("viewBox=");
    expect(page!.xml).toContain("Shape");
    expect(page!.xml).not.toContain("…");
    expect(page!.width).toBe(clips.width);
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

  it("recolors a dark picture to the paper palette", () => {
    const dark = DIAGRAM_PALETTES.dark;
    const paper = DIAGRAM_PALETTES.light;
    const marked = `<rect fill="${dark.bg}"/><text fill="${dark.title}">Hi</text>`;
    const out = recolorDiagramMarkup(marked, dark, paper);
    expect(out).toContain(paper.bg);
    expect(out).toContain(paper.title);
    expect(out).not.toContain(dark.bg);
    expect(recolorDiagramMarkup(marked, paper, paper)).toBe(marked);
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
