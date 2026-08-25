import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { connectionSites, glueConnectors, buildPptxArrayBuffer, PPTX_SLIDE, pptxFitScale, pptxFontPt } from "./pptx";
import { projectTemplate } from "./templates";
import { DIAGRAM_PALETTES } from "./theme";
import { layoutDiagram } from "./layout";

describe("PowerPoint dependency connectors", () => {
  it("glues to the left and right of figures, not the top", () => {
    expect(connectionSites({ x: 0, y: 0 }, { x: 120, y: 0 })).toEqual({
      startIdx: 3,
      endIdx: 1,
    });
    expect(connectionSites({ x: 0, y: 0 }, { x: 40, y: 220 })).toEqual({
      startIdx: 3,
      endIdx: 1,
    });
    expect(connectionSites({ x: 100, y: 10 }, { x: 20, y: 80 })).toEqual({
      startIdx: 1,
      endIdx: 3,
    });
  });

  it("rewrites elbow arrows into curved connectors without arrowheads", () => {
    const xml = [
      `<p:sp><p:nvSpPr><p:cNvPr id="10" name="OPS-node-from"/></p:nvSpPr><p:spPr></p:spPr></p:sp>`,
      `<p:sp><p:nvSpPr><p:cNvPr id="11" name="OPS-node-to"/></p:nvSpPr><p:spPr></p:spPr></p:sp>`,
      `<p:sp><p:nvSpPr><p:cNvPr id="12" name="OPS-dep-d1"/></p:nvSpPr><p:spPr><a:prstGeom prst="bentConnector3"><a:avLst/></a:prstGeom><a:ln w="10000"><a:tailEnd type="triangle"/></a:ln></p:spPr></p:sp>`,
    ].join("");
    const out = glueConnectors(
      xml,
      [{ id: "d1", fromId: "from", toId: "to" }],
      [
        { id: "from", x: 0, y: 0 },
        { id: "to", x: 80, y: 160 },
      ],
    );
    expect(out).toContain("<p:cxnSp>");
    expect(out).toContain('prst="curvedConnector3"');
    expect(out).toContain('<a:stCxn id="10" idx="3"/>');
    expect(out).toContain('<a:endCxn id="11" idx="1"/>');
    expect(out).not.toContain("tailEnd");
    expect(out).not.toContain("bentConnector");
  });
});

describe("PowerPoint workstream end states", () => {
  it("puts each stream end state in a wrapping pill, not a clipped text box", async () => {
    const buf = await buildPptxArrayBuffer(
      projectTemplate(),
      DIAGRAM_PALETTES.light,
    );
    const zip = await JSZip.loadAsync(buf);
    const slidePath = Object.keys(zip.files).find((p) =>
      /^ppt\/slides\/slide\d+\.xml$/.test(p),
    );
    expect(slidePath).toBeTruthy();
    const xml = await zip.file(slidePath!)!.async("string");
    expect(xml).toContain("Users complete the journey unassisted");
    expect(xml).toContain("Support is in place");
    expect(xml).toContain("Benefits are being tracked");
    expect(xml).toContain("LIVE AND USED");
    expect(xml).toContain('prst="roundRect"');
    expect(xml).toContain("normAutofit");
    expect(xml).toContain('wrap="square"');
  });

  it("omits workstream pills when the toggle is off", async () => {
    const on = projectTemplate();
    const off = { ...on, showLoeEndStates: false };
    const onBuf = await buildPptxArrayBuffer(on, DIAGRAM_PALETTES.light);
    const offBuf = await buildPptxArrayBuffer(off, DIAGRAM_PALETTES.light);
    const onZip = await JSZip.loadAsync(onBuf);
    const offZip = await JSZip.loadAsync(offBuf);
    const slidePath = Object.keys(onZip.files).find((p) =>
      /^ppt\/slides\/slide\d+\.xml$/.test(p),
    )!;
    const onXml = await onZip.file(slidePath)!.async("string");
    const offXml = await offZip.file(slidePath)!.async("string");
    const onRects = onXml.match(/prst="roundRect"/g)?.length ?? 0;
    const offRects = offXml.match(/prst="roundRect"/g)?.length ?? 0;
    expect(onRects).toBeGreaterThan(offRects);
    const notesPath = Object.keys(offZip.files).find((p) =>
      /notesSlide\d+\.xml$/.test(p),
    );
    if (notesPath) {
      const notes = await offZip.file(notesPath)!.async("string");
      expect(notes).not.toContain("Workstream end states");
    }
  });
});

describe("PowerPoint 16:9 fit", () => {
  it("is a 16:9 slide", () => {
    expect(PPTX_SLIDE.width / PPTX_SLIDE.height).toBeCloseTo(16 / 9, 3);
  });

  it("shrinks type when the picture grows instead of keeping an 8pt floor", () => {
    const compact = pptxFitScale({ width: 1400, height: 720 });
    const wide = pptxFitScale({ width: 3200, height: 900 });
    expect(wide).toBeLessThan(compact);
    expect(pptxFontPt(13, wide)).toBeLessThan(pptxFontPt(13, compact));
    expect(pptxFontPt(13, wide)).toBeLessThan(8);
  });

  it("writes a 16:9 presentation even for a wide picture", async () => {
    const design = projectTemplate();
    const laid = layoutDiagram(design);
    expect(pptxFitScale(laid) * laid.width).toBeLessThanOrEqual(
      PPTX_SLIDE.width - PPTX_SLIDE.margin * 2 + 0.01,
    );
    expect(pptxFitScale(laid) * laid.height).toBeLessThanOrEqual(
      PPTX_SLIDE.height - PPTX_SLIDE.margin * 2 + 0.01,
    );
    const buf = await buildPptxArrayBuffer(design, DIAGRAM_PALETTES.light);
    const zip = await JSZip.loadAsync(buf);
    const pres = await zip.file("ppt/presentation.xml")!.async("string");
    const cx = Number(pres.match(/sldSz[^>]*cx="(\d+)"/)?.[1]);
    const cy = Number(pres.match(/sldSz[^>]*cy="(\d+)"/)?.[1]);
    expect(cx / cy).toBeCloseTo(16 / 9, 2);
  });
});

describe("PowerPoint detail slide", () => {
  it("is one 16:9 slide when the detail figure is off", async () => {
    const buf = await buildPptxArrayBuffer(
      projectTemplate(),
      DIAGRAM_PALETTES.light,
    );
    const zip = await JSZip.loadAsync(buf);
    const slides = Object.keys(zip.files).filter((p) =>
      /^ppt\/slides\/slide\d+\.xml$/.test(p),
    );
    expect(slides).toHaveLength(1);
  });

  it("adds a second 16:9 slide of the list when the detail figure is on", async () => {
    const design = { ...projectTemplate(), showDetail: true };
    const buf = await buildPptxArrayBuffer(design, DIAGRAM_PALETTES.light);
    const zip = await JSZip.loadAsync(buf);
    const slides = Object.keys(zip.files)
      .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
      .sort();
    expect(slides).toHaveLength(2);
    const detail = await zip.file(slides[1])!.async("string");
    expect(detail).toContain("M1: Problem framed");
    expect(detail).toContain("Worth defining?");
    expect(detail).toContain("Service");
    const picture = await zip.file(slides[0])!.async("string");
    expect(picture).toContain("LIVE AND USED");
    const pres = await zip.file("ppt/presentation.xml")!.async("string");
    const cx = Number(pres.match(/sldSz[^>]*cx="(\d+)"/)?.[1]);
    const cy = Number(pres.match(/sldSz[^>]*cy="(\d+)"/)?.[1]);
    expect(cx / cy).toBeCloseTo(16 / 9, 2);
  });
});
