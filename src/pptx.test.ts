import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { connectionSites, glueConnectors, buildPptxArrayBuffer, briefingOutline, PPTX_SLIDE, pptxFitScale, pptxFontPt, layoutDetailSlide, layoutDetailSlides } from "./pptx";
import { epicFuryTemplate, projectTemplate } from "./templates";
import { DIAGRAM_PALETTES } from "./theme";
import { layoutDiagram } from "./layout";
import type { DetailSlideLayout } from "./pptxDetail";

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
  it("is overview plus one slide per phase when the detail figure is off", async () => {
    const design = projectTemplate();
    const buf = await buildPptxArrayBuffer(design, DIAGRAM_PALETTES.light);
    const zip = await JSZip.loadAsync(buf);
    const slides = Object.keys(zip.files).filter((p) =>
      /^ppt\/slides\/slide\d+\.xml$/.test(p),
    );
    expect(slides).toHaveLength(1 + design.phases.length);
    expect(briefingOutline(design).map((s) => s.kind)).toEqual([
      "overview",
      ...design.phases.map(() => "phase"),
    ]);
  });

  it("walks Epic Fury as overview, then each phase, then that phase's notes", () => {
    const design = epicFuryTemplate();
    const outline = briefingOutline(design);
    expect(outline[0]).toEqual({ kind: "overview" });
    expect(outline.filter((s) => s.kind === "phase")).toHaveLength(
      design.phases.length,
    );
    expect(outline.filter((s) => s.kind === "notes").length).toBeGreaterThan(
      design.phases.length,
    );
    const firstNotes = outline.findIndex((s) => s.kind === "notes");
    expect(outline[firstNotes - 1]?.kind).toBe("phase");
    expect(outline[firstNotes]?.phaseName).toBe(outline[firstNotes - 1]?.phaseName);
  });

  it("adds 16:9 detail slides when the detail figure is on", async () => {
    const design = { ...projectTemplate(), showDetail: true };
    const buf = await buildPptxArrayBuffer(design, DIAGRAM_PALETTES.light);
    const zip = await JSZip.loadAsync(buf);
    const slides = Object.keys(zip.files)
      .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
      .sort();
    expect(slides.length).toBeGreaterThan(1 + design.phases.length);
    const detailXml = (
      await Promise.all(slides.slice(1).map((p) => zip.file(p)!.async("string")))
    ).join("\n");
    expect(detailXml).toContain("M1: Problem framed");
    expect(detailXml).toContain("Worth defining?");
    expect(detailXml).toContain("Service");
    expect(detailXml).toContain("Discover");
    const picture = await zip.file(slides[0])!.async("string");
    expect(picture).toContain("LIVE AND USED");
    const pres = await zip.file("ppt/presentation.xml")!.async("string");
    const cx = Number(pres.match(/sldSz[^>]*cx="(\d+)"/)?.[1]);
    const cy = Number(pres.match(/sldSz[^>]*cy="(\d+)"/)?.[1]);
    expect(cx / cy).toBeCloseTo(16 / 9, 2);
  });

  it("keeps workstream cards below the gates and lays gates in a row", () => {
    const laid = layoutDetailSlide({ ...projectTemplate(), showDetail: true });
    expect(laid.gates).toHaveLength(3);
    expect(laid.gates[1].x).toBeGreaterThan(laid.gates[0].x);
    expect(Math.abs(laid.gates[1].y - laid.gates[0].y)).toBeLessThan(0.02);
    const gateBottom = Math.max(...laid.gates.map((g) => g.y + g.h));
    for (const stream of laid.streams) {
      expect(stream.card.y).toBeGreaterThan(gateBottom + 0.08);
      expect(stream.phases.length).toBeGreaterThan(0);
    }
    expect(laid.streams[0].phases[0].name).toBe("Discover");
    expect(laid.gates[0].desc).toContain("design time");
    assertReadableStack(
      layoutDetailSlides({ ...projectTemplate(), showDetail: true }),
    );
    const allCopy = layoutDetailSlides({
      ...projectTemplate(),
      showDetail: true,
    })
      .flatMap((page) => [
        ...page.gates.map((g) => g.desc),
        ...page.streams.flatMap((stream) =>
          stream.phases.flatMap((phase) =>
            phase.items.flatMap((item) => item.descLines),
          ),
        ),
      ])
      .join(" ");
    expect(allCopy).toContain("rollback that has been walked through");
    expect(allCopy).toContain("Monday morning");
    for (const stream of laid.streams) {
      expect(stream.phases.some((p) => p.items.some((i) => i.descLines.length))).toBe(
        true,
      );
      for (const phase of stream.phases) {
        for (const item of phase.items) {
          const bottom = item.desc
            ? item.desc.y + item.desc.h
            : item.label.y + item.label.h;
          expect(bottom).toBeLessThanOrEqual(stream.card.y + stream.card.h - 0.06);
        }
      }
    }
  });

  it("uses figure marks instead of stacked unicode text", async () => {
    const design = { ...projectTemplate(), showDetail: true };
    const buf = await buildPptxArrayBuffer(design, DIAGRAM_PALETTES.light);
    const zip = await JSZip.loadAsync(buf);
    const slides = Object.keys(zip.files)
      .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
      .sort();
    const detailXml = (
      await Promise.all(slides.slice(1).map((p) => zip.file(p)!.async("string")))
    ).join("\n");
    expect(detailXml).toContain('prst="star5"');
    expect(detailXml).toContain('prst="triangle"');
    expect(detailXml).toContain('prst="diamond"');
    expect(detailXml).toContain("After Discover");
    expect(detailXml).toContain("cannot finish an application");
    expect(detailXml).not.toContain("▲");
    expect(detailXml).not.toContain("◆");
  });

  it("continues long descriptions on extra 16:9 slides instead of shrinking them", async () => {
    const base = projectTemplate();
    const long =
      "The receiving owner accepts the service as ready to run. " +
      "This supporting note is deliberately long so the briefing cannot keep every line on one 16:9 card. ".repeat(
        12,
      );
    const design = {
      ...base,
      showDetail: true,
      nodes: base.nodes.map((n, i) =>
        i === 0 ? { ...n, description: long } : n,
      ),
    };
    const pages = layoutDetailSlides(design);
    expect(pages.length).toBeGreaterThan(1);
    const spoken = pages
      .flatMap((page) =>
        page.streams.flatMap((stream) =>
          stream.phases.flatMap((phase) =>
            phase.items.flatMap((item) => item.descLines),
          ),
        ),
      )
      .join(" ");
    expect(spoken).toContain("deliberately long");
    expect(spoken).toContain("16:9 card");
    for (const page of pages) {
      for (const stream of page.streams) {
        for (const phase of stream.phases) {
          for (const item of phase.items) {
            const bottom = item.desc
              ? item.desc.y + item.desc.h
              : item.label.y + item.label.h;
            expect(bottom).toBeLessThanOrEqual(stream.card.y + stream.card.h);
          }
        }
      }
    }
    const buf = await buildPptxArrayBuffer(design, DIAGRAM_PALETTES.light);
    const zip = await JSZip.loadAsync(buf);
    const slides = Object.keys(zip.files)
      .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
      .sort();
    expect(slides.length).toBeGreaterThan(2);
    const detailXml = (
      await Promise.all(slides.slice(1).map((p) => zip.file(p)!.async("string")))
    ).join("\n");
    expect(detailXml).toContain("deliberately long");
  });

  it("stacks wrapped labels, names, and notes so Operation Epic Fury does not overlap", () => {
    const design = epicFuryTemplate();
    const pages = layoutDetailSlides(design);
    expect(pages.length).toBeGreaterThan(3);
    const spoken = pages
      .flatMap((page) => [
        ...page.gates.map((g) => `${g.label} ${g.meta} ${g.desc}`),
        ...page.streams.flatMap((stream) => [
          stream.name,
          ...stream.phases.flatMap((phase) => [
            phase.name,
            ...phase.items.flatMap((item) => [
              item.text,
              ...item.labelLines,
              ...item.descLines,
            ]),
          ]),
        ]),
      ])
      .join(" ");
    expect(spoken).toContain("Execute, or continue shaping?");
    expect(spoken).toContain("After Shape");
    expect(spoken).toContain("fielded launch capability");
    expect(spoken).toContain("fissile material");
    expect(spoken).toContain("Force and regional protection");
    expect(spoken).not.toContain("walked through…");
    assertReadableStack(pages);
    for (const page of pages) {
      for (const g of page.gates) {
        expect(g.metaBox).toBeTruthy();
        expect(g.labelBox.y + g.labelBox.h).toBeLessThanOrEqual(
          g.metaBox!.y + 0.02,
        );
      }
      for (const stream of page.streams) {
        if (stream.name.includes("regional protection")) {
          expect(stream.nameBox.h).toBeGreaterThan(0.24);
        }
      }
    }
  });
});

type Box = { x: number; y: number; w: number; h: number };

function overlap(a: Box, b: Box, slack = 0.03): boolean {
  return (
    a.x < b.x + b.w - slack &&
    a.x + a.w > b.x + slack &&
    a.y < b.y + b.h - slack &&
    a.y + a.h > b.y + slack
  );
}

function assertReadableStack(pages: DetailSlideLayout[]) {
  for (const page of pages) {
    for (const g of page.gates) {
      if (g.metaBox) {
        expect(overlap(g.labelBox, g.metaBox)).toBe(false);
      }
      if (g.descBox) {
        expect(overlap(g.labelBox, g.descBox)).toBe(false);
        if (g.metaBox) expect(overlap(g.metaBox, g.descBox)).toBe(false);
      }
      const bottom = g.descBox
        ? g.descBox.y + g.descBox.h
        : g.metaBox
          ? g.metaBox.y + g.metaBox.h
          : g.labelBox.y + g.labelBox.h;
      expect(bottom).toBeLessThanOrEqual(g.y + g.h + 0.02);
    }
    for (const stream of page.streams) {
      const pieces: Box[] = [stream.nameBox];
      if (stream.purposeBox) pieces.push(stream.purposeBox);
      if (stream.empty) pieces.push(stream.empty);
      for (const phase of stream.phases) {
        if (phase.name) pieces.push(phase.heading);
        for (const item of phase.items) {
          pieces.push(item.label);
          if (item.desc) pieces.push(item.desc);
          const bottom = item.desc
            ? item.desc.y + item.desc.h
            : item.label.y + item.label.h;
          expect(bottom).toBeLessThanOrEqual(stream.card.y + stream.card.h);
        }
      }
      for (let i = 0; i < pieces.length; i++) {
        for (let j = i + 1; j < pieces.length; j++) {
          expect(overlap(pieces[i], pieces[j])).toBe(false);
        }
      }
    }
  }
}
