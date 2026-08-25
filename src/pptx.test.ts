import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { connectionSites, glueConnectors, buildPptxArrayBuffer } from "./pptx";
import { projectTemplate } from "./templates";
import { DIAGRAM_PALETTES } from "./theme";

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
});
