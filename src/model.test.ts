import { describe, expect, it } from "vitest";
import { wrapLabel, wrapNodeLabel, nodeLabelSize, NODE_LABEL } from "./wrap";
import { wouldCreateCycle, nextOrder, hasDependency } from "./design";
import {
  LAYOUT,
  LOE_GUTTER,
  columnAtX,
  endStateTextBox,
  layoutDiagram,
  loeGutterTextWidth,
  minPhaseSlots,
  nodeColumns,
  phaseMetrics,
  snapGateAtX,
  wrapLoeName,
} from "./layout";
import { reduceDesign, selectionAfter } from "./reducer";
import type { OperationalDesign } from "./types";

function design(
  partial: Partial<OperationalDesign> = {},
): OperationalDesign {
  return {
    id: "t",
    title: "Test",
    purpose: "",
    endState: { name: "END", description: "Done.", color: "#5A6A78" },
    phases: [
      { id: "p1", name: "One" },
      { id: "p2", name: "Two" },
      { id: "p3", name: "Three" },
    ],
    linesOfEffort: [
      { id: "l1", name: "Alpha", color: "#E87722", purpose: "A", endState: "" },
      { id: "l2", name: "Beta", color: "#5B8C2A", purpose: "B", endState: "" },
    ],
    nodes: [],
    dependencies: [],
    decisionPoints: [
      {
        id: "d1",
        label: "Go?",
        afterPhaseId: "p1",
        placement: "after",
        order: 0,
        description: "",
      },
    ],
    ...partial,
  };
}

function node(
  id: string,
  loeId: string,
  phaseId: string,
  order: number,
  kind: "milestone" | "condition" = "milestone",
) {
  return {
    id,
    kind,
    loeId,
    phaseId,
    label: id,
    description: "",
    order,
  };
}

describe("phaseMetrics", () => {
  it("keeps the default width while nodes sit in the last min-width column", () => {
    const minSlots = minPhaseSlots();
    expect(minSlots).toBe(3);
    expect(phaseMetrics(1).width).toBe(LAYOUT.phaseMin);
    expect(phaseMetrics(minSlots).width).toBe(LAYOUT.phaseMin);
    expect(phaseMetrics(minSlots).slots).toBe(minSlots);
  });

  it("grows only after the default columns are full", () => {
    const grown = phaseMetrics(minPhaseSlots() + 1);
    expect(grown.width).toBeGreaterThan(LAYOUT.phaseMin);
    expect(grown.slots).toBe(minPhaseSlots() + 1);
  });
});

describe("layoutDiagram", () => {
  it("does not expand a phase when a node is placed in the last default column", () => {
    const before = layoutDiagram(design());
    const withEdge = layoutDiagram(
      design({
        nodes: [node("n1", "l1", "p1", minPhaseSlots() - 1)],
      }),
    );
    const p1Before = before.phases.find((p) => p.id === "p1")!;
    const p1After = withEdge.phases.find((p) => p.id === "p1")!;
    expect(p1After.width).toBe(p1Before.width);
    expect(p1After.width).toBe(LAYOUT.phaseMin);
    const placed = withEdge.nodes.find((n) => n.id === "n1")!;
    expect(placed.x).toBeGreaterThan(
      p1After.x + p1After.width * 0.7,
    );
  });

  it("sits a node in the middle of a default phase", () => {
    const laid = layoutDiagram(
      design({
        nodes: [node("n1", "l1", "p1", 1)],
      }),
    );
    const phase = laid.phases[0];
    const placed = laid.nodes.find((n) => n.id === "n1")!;
    expect(phase.width).toBe(LAYOUT.phaseMin);
    expect(placed.x).toBeCloseTo(phase.x + phase.width / 2, 0);
  });

  it("wraps a long workstream name so it stays off the coloured line", () => {
    const laid = layoutDiagram(
      design({
        linesOfEffort: [
          {
            id: "l1",
            name: "Service. Here is an example of a very long workstream name",
            color: "#E87722",
            purpose: "Build the right service",
            endState: "",
          },
          { id: "l2", name: "Beta", color: "#5B8C2A", purpose: "B", endState: "" },
        ],
      }),
    );
    const loe = laid.loes.find((l) => l.id === "l1")!;
    expect(loe.nameLines.length).toBeGreaterThan(1);
    const maxPx = loeGutterTextWidth();
    for (const line of loe.nameLines) {
      expect(line.length * LOE_GUTTER.namePx).toBeLessThanOrEqual(maxPx + 8);
    }
    expect(wrapLoeName("Service").length).toBe(1);
  });

  it("expands only when a later column is required", () => {
    const laid = layoutDiagram(
      design({
        nodes: [node("n1", "l1", "p1", minPhaseSlots())],
      }),
    );
    expect(laid.phases[0].width).toBeGreaterThan(LAYOUT.phaseMin);
  });

  it("lands every workstream on a stream end state that feeds the campaign panel", () => {
    const laid = layoutDiagram(
      design({
        nodes: [
          node("a", "l1", "p1", 0),
          node("b", "l2", "p2", 0),
        ],
      }),
    );
    expect(laid.loes.length).toBe(2);
    expect(laid.loeEndStates).toHaveLength(2);
    for (let i = 0; i < laid.loes.length; i++) {
      const loe = laid.loes[i];
      const pill = laid.loeEndStates[i];
      expect(loe.x2).toBe(pill.x);
      expect(pill.x + pill.width).toBeLessThan(laid.endState.x);
      expect(loe.y).toBeGreaterThanOrEqual(laid.endState.y);
      expect(loe.y).toBeLessThanOrEqual(
        laid.endState.y + laid.endState.height,
      );
    }
  });

  it("wraps a workstream end state inside the pill", () => {
    const laid = layoutDiagram(
      design({
        linesOfEffort: [
          {
            id: "l1",
            name: "Alpha",
            color: "#E87722",
            purpose: "A",
            endState:
              "Users complete the journey unassisted and do not call the helpdesk.",
          },
          { id: "l2", name: "Beta", color: "#5B8C2A", purpose: "B", endState: "" },
        ],
      }),
    );
    const pill = laid.loeEndStates.find((p) => p.id === "l1")!;
    expect(pill.lines.length).toBeGreaterThan(1);
    expect(pill.lines.join(" ")).toContain("unassisted");
    expect(pill.x).toBe(laid.loes.find((l) => l.id === "l1")!.x2);
  });

  it("snaps a gate inside a phase or onto the seam after it", () => {
    const laid = layoutDiagram(design());
    const phase = laid.phases[0];
    const inside = snapGateAtX(laid.phases, phase.x + phase.width * 0.4);
    const seam = snapGateAtX(laid.phases, phase.x + phase.width);
    expect(inside?.placement).toBe("in");
    expect(inside?.phaseId).toBe(phase.id);
    expect(seam?.placement).toBe("after");
    expect(seam?.phaseId).toBe(phase.id);
  });

  it("maps a drop in the middle of a phase to the middle column", () => {
    const laid = layoutDiagram(design());
    const phase = laid.phases[0];
    expect(columnAtX(phase, phase.x + phase.width / 2)).toBe(1);
  });

  it("maps a drop at the right edge to a new column so the phase can grow", () => {
    const laid = layoutDiagram(design());
    const phase = laid.phases[0];
    const col = columnAtX(phase, phase.x + phase.width - 2);
    expect(col).toBe(phase.slots);
  });

  it("keeps two nodes in a phase far enough apart that labels need not sit on each other", () => {
    const laid = layoutDiagram(
      design({
        nodes: [node("a", "l1", "p1", 0), node("b", "l1", "p1", 1)],
      }),
    );
    const a = laid.nodes.find((n) => n.id === "a")!;
    const b = laid.nodes.find((n) => n.id === "b")!;
    expect(Math.abs(b.x - a.x)).toBeGreaterThanOrEqual(
      LAYOUT.phaseMin / minPhaseSlots() - 1,
    );
  });

  it("widens a phase so long labels do not sit on each other", () => {
    const label =
      "Need is understood by the clinics who must change how they book";
    const laid = layoutDiagram(
      design({
        nodes: [
          {
            id: "a",
            kind: "condition",
            loeId: "l1",
            phaseId: "p1",
            label,
            description: "",
            order: 0,
          },
          {
            id: "b",
            kind: "condition",
            loeId: "l1",
            phaseId: "p1",
            label,
            description: "",
            order: 1,
          },
        ],
      }),
    );
    const a = laid.nodes.find((n) => n.id === "a")!;
    const b = laid.nodes.find((n) => n.id === "b")!;
    const box = nodeLabelSize(label);
    const gap = Math.abs(b.x - a.x) - box.width;
    expect(gap).toBeGreaterThanOrEqual(NODE_LABEL.gap - 1);
    expect(laid.phases[0].width).toBeGreaterThan(LAYOUT.phaseMin);
  });

  it("wraps title and purpose instead of clipping them", () => {
    const purpose =
      "Replace phone booking with a journey patients can complete without calling, including those who need a human path when the digital one fails.";
    const laid = layoutDiagram(
      design({
        title: "Clinic booking go-live for every partner site this year",
        purpose,
      }),
    );
    expect(laid.purposeLines.join(" ")).toContain("human path");
    expect(laid.purposeLines.join("")).not.toContain("…");
    expect(laid.titleLines.length).toBeGreaterThanOrEqual(1);
    expect(laid.height).toBeGreaterThan(layoutDiagram(design()).height);
  });
});

describe("nodeColumns", () => {
  it("pushes a same-phase successor to the right of its predecessor", () => {
    const d = design({
      nodes: [
        node("a", "l1", "p1", 0),
        node("b", "l2", "p1", 0),
      ],
      dependencies: [{ id: "dep", fromId: "a", toId: "b" }],
    });
    const cols = nodeColumns(d);
    expect(cols.get("b")!).toBeGreaterThan(cols.get("a")!);
  });
});

describe("reduceDesign", () => {
  it("does not create a gate when adding a phase", () => {
    const next = reduceDesign(design(), {
      type: "addPhase",
      afterId: "p1",
      id: "p-new",
    });
    expect(next.phases.map((p) => p.id)).toEqual([
      "p1",
      "p-new",
      "p2",
      "p3",
    ]);
    expect(next.decisionPoints).toHaveLength(1);
  });

  it("changes end-state colour without dropping the name", () => {
    const next = reduceDesign(design(), {
      type: "setEndState",
      color: "#1A365D",
    });
    expect(next.endState.color).toBe("#1A365D");
    expect(next.endState.name).toBe("END");
  });

  it("sets a workstream end state without dropping the name", () => {
    const next = reduceDesign(design(), {
      type: "updateLoe",
      id: "l1",
      endState: "This stream is complete.",
    });
    const loe = next.linesOfEffort.find((l) => l.id === "l1")!;
    expect(loe.name).toBe("Alpha");
    expect(loe.endState).toBe("This stream is complete.");
  });

  it("adds a gate at the requested snap without moving the others", () => {
    const next = reduceDesign(design(), {
      type: "addDp",
      id: "d2",
      afterPhaseId: "p2",
      placement: "in",
      order: 1,
    });
    expect(next.decisionPoints).toHaveLength(2);
    const added = next.decisionPoints.find((d) => d.id === "d2")!;
    expect(added.placement).toBe("in");
    expect(added.afterPhaseId).toBe("p2");
    expect(added.order).toBe(1);
    expect(next.decisionPoints.find((d) => d.id === "d1")?.label).toBe("Go?");
  });

  it("moves a gate between in-phase and after-phase", () => {
    const next = reduceDesign(design(), {
      type: "updateDp",
      id: "d1",
      placement: "in",
      order: 2,
    });
    expect(next.decisionPoints[0].placement).toBe("in");
    expect(next.decisionPoints[0].order).toBe(2);
  });

  it("drops selection when the selected gate is removed", () => {
    const next = reduceDesign(design(), { type: "removeDp", id: "d1" });
    expect(selectionAfter(next, { type: "dp", id: "d1" })).toBeNull();
  });

  it("rehomes nodes when a phase is removed and does not leave orphan gates", () => {
    const start = design({
      nodes: [node("n1", "l1", "p2", 0)],
      decisionPoints: [
        {
          id: "d1",
          label: "Go?",
          afterPhaseId: "p1",
          placement: "after",
          order: 0,
          description: "",
        },
        {
          id: "d2",
          label: "Stop?",
          afterPhaseId: "p2",
          placement: "in",
          order: 0,
          description: "",
        },
      ],
    });
    const next = reduceDesign(start, { type: "removePhase", id: "p2" });
    expect(next.phases.map((p) => p.id)).toEqual(["p1", "p3"]);
    expect(next.nodes[0].phaseId).toBe("p3");
    expect(next.decisionPoints.map((d) => d.id)).toEqual(["d1"]);
  });

  it("lays out a crowded picture without overlapping workstream arrows off the panel", () => {
    const nodes = [];
    const dps = [];
    for (let p = 1; p <= 3; p++) {
      for (let l = 1; l <= 2; l++) {
        nodes.push(node(`n-${l}-${p}`, `l${l}`, `p${p}`, p === 3 ? 2 : 0));
      }
      dps.push({
        id: `d-in-${p}`,
        label: `In ${p}?`,
        afterPhaseId: `p${p}`,
        placement: "in" as const,
        order: 1,
        description: "",
      });
      dps.push({
        id: `d-after-${p}`,
        label: `After ${p}?`,
        afterPhaseId: `p${p}`,
        placement: "after" as const,
        order: 0,
        description: "",
      });
    }
    const laid = layoutDiagram(
      design({
        nodes,
        decisionPoints: dps,
        dependencies: [
          { id: "dep1", fromId: "n-1-1", toId: "n-2-1" },
          { id: "dep2", fromId: "n-1-2", toId: "n-1-3" },
        ],
      }),
    );
    expect(laid.dps).toHaveLength(6);
    expect(laid.nodes).toHaveLength(6);
    expect(new Set(laid.dps.map((d) => d.id)).size).toBe(6);
    for (const loe of laid.loes) {
      const pill = laid.loeEndStates.find((p) => p.id === loe.id)!;
      expect(loe.x2).toBe(pill.x);
      expect(pill.x + pill.width).toBeLessThan(laid.endState.x);
    }
    const xs = laid.dps.map((d) => d.x).sort((a, b) => a - b);
    expect(xs[0]).toBeGreaterThan(laid.plot.x - 20);
    expect(xs[xs.length - 1]).toBeLessThan(laid.endCol.x + 40);
  });

  it("places a node later in the same phase", () => {
    const start = design({ nodes: [node("n1", "l1", "p1", 0)] });
    const later = minPhaseSlots() - 1;
    const next = reduceDesign(start, {
      type: "placeNode",
      id: "n1",
      phaseId: "p1",
      order: later,
    });
    expect(next.nodes[0].order).toBe(later);
    expect(layoutDiagram(next).phases[0].width).toBe(LAYOUT.phaseMin);
  });

  it("adds a node in the middle of an empty phase when given that slot", () => {
    const next = reduceDesign(design(), {
      type: "addNode",
      id: "n1",
      kind: "milestone",
      loeId: "l1",
      phaseId: "p1",
      order: 1,
    });
    expect(next.nodes[0].order).toBe(1);
    const laid = layoutDiagram(next);
    const phase = laid.phases[0];
    expect(laid.nodes[0].x).toBeCloseTo(phase.x + phase.width / 2, 0);
  });

  it("rejects a dependency cycle", () => {
    const start = design({
      nodes: [node("a", "l1", "p1", 0), node("b", "l1", "p2", 0)],
      dependencies: [{ id: "d", fromId: "a", toId: "b" }],
    });
    const cycled = reduceDesign(start, {
      type: "addDependency",
      fromId: "b",
      toId: "a",
    });
    expect(cycled.dependencies).toHaveLength(1);
  });
});

describe("design helpers", () => {
  it("nextOrder sits after existing nodes in the cell", () => {
    const d = design({
      nodes: [node("a", "l1", "p1", 0), node("b", "l1", "p1", 2)],
    });
    expect(nextOrder(d, "l1", "p1")).toBe(3);
    expect(nextOrder(d, "l1", "p2")).toBe(0);
  });

  it("detects cycles and existing links", () => {
    const deps = [
      { id: "1", fromId: "a", toId: "b" },
      { id: "2", fromId: "b", toId: "c" },
    ];
    expect(wouldCreateCycle(deps, "c", "a")).toBe(true);
    expect(wouldCreateCycle(deps, "a", "c")).toBe(false);
    expect(hasDependency(deps, "a", "b")).toBe(true);
  });
});

describe("wrapLabel", () => {
  it("keeps short names intact and splits long description text", () => {
    expect(wrapLabel("LIVE AND USED", 22, 6)).toEqual(["LIVE AND USED"]);
    const lines = wrapLabel(
      "Users complete the journey unassisted. Support is in place.",
      26,
      14,
    );
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join(" ")).toContain("unassisted");
  });

  it("breaks an overlong token instead of overflowing", () => {
    const lines = wrapLabel("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 8, 4);
    expect(lines[0]?.length).toBeLessThanOrEqual(8);
    expect(lines.join("").startsWith("ABCDEFGH")).toBe(true);
  });

  it("keeps the words of a node label instead of clipping them", () => {
    const lines = wrapNodeLabel("M2: Requirements signed");
    expect(lines.join(" ")).toContain("Requirements");
    expect(lines.join(" ")).toContain("signed");
    expect(lines.join("")).not.toContain("…");
  });

  it("grows a node label box with longer text", () => {
    const short = nodeLabelSize("Go");
    const long = nodeLabelSize("Need is understood by the clinics who must change");
    expect(long.height).toBeGreaterThan(short.height);
    expect(long.lines.join("")).not.toContain("…");
  });
});

describe("endStateTextBox", () => {
  it("centres the name and what-will-be-true with a tight inner margin", () => {
    const laid = layoutDiagram(
      design({
        endState: {
          name: "LIVE AND USED",
          description:
            "Users complete the journey unassisted. Support is in place. Residual risk is accepted. Benefits are being tracked.",
          color: "#5A6A78",
        },
      }),
    );
    const box = endStateTextBox(laid.endState);
    expect(laid.endState.descriptionLines.length).toBeGreaterThan(1);
    expect(box.nameX).toBe(laid.endState.x + laid.endState.width / 2);
    expect(box.descX).toBe(box.nameX);
    expect(box.descW).toBeGreaterThan(laid.endState.width * 0.85);
    expect(laid.endState.descriptionLines.some((line) => line.length > 26)).toBe(
      true,
    );
  });
});
