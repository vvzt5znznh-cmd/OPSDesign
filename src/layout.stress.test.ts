import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { layoutDiagram } from "./layout";
import { parseImportedDesign } from "./storage";
import { epicFuryTemplate } from "./templates";
import { NODE_LABEL, nodeLabelSize } from "./wrap";
import type { OperationalDesign } from "./types";

function loadFixture(name: string): OperationalDesign {
  const text = readFileSync(
    new URL(`../public/fixtures/${name}.json`, import.meta.url),
    "utf8",
  );
  return parseImportedDesign(text);
}

function labelBox(n: { x: number; y: number; label: string }) {
  const size = nodeLabelSize(n.label);
  return {
    left: n.x - size.width / 2,
    right: n.x + size.width / 2,
    top: n.y + NODE_LABEL.markToLabel,
    bottom: n.y + NODE_LABEL.markToLabel + size.height,
  };
}

function sameStreamOverlaps(design: OperationalDesign) {
  const laid = layoutDiagram(design);
  const hits: string[] = [];
  for (const loe of design.linesOfEffort) {
    const boxes = laid.nodes
      .filter((n) => n.loeId === loe.id)
      .map((n) => ({ id: n.id, label: n.label, ...labelBox(n) }))
      .sort((a, b) => a.left - b.left);
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        const overlapX = a.right > b.left + 0.5;
        const overlapY = a.bottom > b.top + 0.5 && b.bottom > a.top + 0.5;
        if (overlapX && overlapY) {
          hits.push(`${a.id} (${a.label}) overlaps ${b.id} (${b.label})`);
        }
      }
    }
  }
  return { laid, hits };
}

describe("File → Open JSON fixtures", () => {
  it("opens the clean clinic-booking file", () => {
    const clean = loadFixture("clean");
    const { laid, hits } = sameStreamOverlaps(clean);
    expect(hits).toEqual([]);
    expect(clean.nodes).toHaveLength(13);
    expect(laid.purposeLines.join("")).not.toContain("…");
    expect(laid.purposeLines.join(" ")).toContain("without calling");
    expect(laid.titleLines.join(" ")).toBe("Clinic booking go-live");
  });

  it("opens the noisy packed file without clipping title or purpose", () => {
    const noisy = loadFixture("noisy");
    const laid = layoutDiagram(noisy);
    expect(noisy.nodes).toHaveLength(125);
    expect(laid.purposeLines.join(" ")).toContain("human path");
    expect(laid.purposeLines.join("")).not.toContain("…");
    expect(laid.titleLines.join(" ")).toContain("paper diary");
    expect(laid.titleLines.join("")).not.toContain("…");
    expect(laid.purposeLines.join(" ")).toContain("full day of appointments");
  });

  it("grows the noisy picture instead of overlapping labels", () => {
    const clean = loadFixture("clean");
    const noisy = loadFixture("noisy");
    const { laid, hits } = sameStreamOverlaps(noisy);
    const tidy = layoutDiagram(clean);
    expect(hits).toEqual([]);
    expect(laid.width).toBeGreaterThan(tidy.width * 1.5);
    expect(laid.height).toBeGreaterThan(tidy.height);
    for (const n of laid.nodes) {
      expect(n.x).toBeGreaterThan(laid.plot.x);
      expect(n.x).toBeLessThan(laid.endState.x);
    }
  });

  it("keeps the long noisy labels in full", () => {
    const noisy = loadFixture("noisy");
    const laid = layoutDiagram(noisy);
    const long = laid.nodes.filter((n) => n.label.includes("clinics who must"));
    expect(long.length).toBe(noisy.linesOfEffort.length * noisy.phases.length);
    for (const n of long) {
      expect(nodeLabelSize(n.label).lines.join("")).not.toContain("…");
    }
  });

  it("lays out Operation Epic Fury without overlapping labels on a stream", () => {
    const design = epicFuryTemplate();
    const { laid, hits } = sameStreamOverlaps(design);
    expect(hits).toEqual([]);
    expect(design.linesOfEffort).toHaveLength(6);
    expect(design.decisionPoints).toHaveLength(6);
    expect(design.nodes.length).toBeGreaterThan(20);
    expect(design.showDetail).toBe(true);
    expect(laid.titleLines.join(" ")).toContain("Epic Fury");
    expect(laid.purposeLines.join("")).not.toContain("…");
  });
});
