import { hasDependency, nextLabel, nextOrder, nodesInCell, wouldCreateCycle } from "./design";
import { uid } from "./id";
import {
  LOE_COLORS,
  type NodeKind,
  type OperationalDesign,
  type Selection,
} from "./types";

export type DesignAction =
  | { type: "replace"; design: OperationalDesign }
  | { type: "setTitle"; title: string }
  | { type: "setPurpose"; purpose: string }
  | { type: "setEndState"; name?: string; description?: string }
  | { type: "addPhase"; afterId?: string; id?: string }
  | { type: "renamePhase"; id: string; name: string }
  | { type: "removePhase"; id: string }
  | { type: "movePhase"; id: string; direction: -1 | 1 }
  | { type: "addLoe"; id?: string }
  | { type: "updateLoe"; id: string; name?: string; color?: string }
  | { type: "removeLoe"; id: string }
  | { type: "moveLoe"; id: string; direction: -1 | 1 }
  | {
      type: "addNode";
      loeId: string;
      phaseId: string;
      kind: NodeKind;
      label?: string;
      id?: string;
    }
  | {
      type: "updateNode";
      id: string;
      label?: string;
      description?: string;
      loeId?: string;
      phaseId?: string;
      kind?: NodeKind;
    }
  | { type: "removeNode"; id: string }
  | { type: "placeNode"; id: string; phaseId: string; order: number }
  | { type: "addDependency"; fromId: string; toId: string; id?: string }
  | { type: "removeDependency"; id: string }
  | { type: "addDp"; afterPhaseId: string; id?: string }
  | {
      type: "updateDp";
      id: string;
      label?: string;
      description?: string;
      afterPhaseId?: string;
    }
  | { type: "removeDp"; id: string };

function withoutNodeDeps(
  design: OperationalDesign,
  nodeIds: Set<string>,
): OperationalDesign["dependencies"] {
  return design.dependencies.filter(
    (d) => !nodeIds.has(d.fromId) && !nodeIds.has(d.toId),
  );
}

export function reduceDesign(
  design: OperationalDesign,
  action: DesignAction,
): OperationalDesign {
  switch (action.type) {
    case "replace":
      return action.design;
    case "setTitle":
      return { ...design, title: action.title };
    case "setPurpose":
      return { ...design, purpose: action.purpose };
    case "setEndState":
      return {
        ...design,
        endState: {
          name: action.name ?? design.endState.name,
          description: action.description ?? design.endState.description,
        },
      };
    case "addPhase": {
      const phase = {
        id: action.id ?? uid("ph"),
        name: `Phase ${design.phases.length + 1}`,
      };
      const phases = [...design.phases];
      const idx = action.afterId
        ? phases.findIndex((p) => p.id === action.afterId)
        : phases.length - 1;
      const insertAt = idx >= 0 ? idx + 1 : phases.length;
      phases.splice(insertAt, 0, phase);
      const dpAfterId =
        insertAt < phases.length - 1
          ? phase.id
          : insertAt > 0
            ? phases[insertAt - 1].id
            : null;
      const hasDp =
        dpAfterId != null &&
        design.decisionPoints.some((dp) => dp.afterPhaseId === dpAfterId);
      const decisionPoints =
        dpAfterId && !hasDp
          ? [
              ...design.decisionPoints,
              {
                id: uid("dp"),
                label: `Gate ${design.decisionPoints.length + 1}`,
                afterPhaseId: dpAfterId,
                description: "",
              },
            ]
          : design.decisionPoints;
      return { ...design, phases, decisionPoints };
    }
    case "renamePhase":
      return {
        ...design,
        phases: design.phases.map((p) =>
          p.id === action.id ? { ...p, name: action.name } : p,
        ),
      };
    case "removePhase": {
      if (design.phases.length <= 1) return design;
      const remaining = design.phases.filter((p) => p.id !== action.id);
      const fallback = remaining[remaining.length - 1].id;
      return {
        ...design,
        phases: remaining,
        nodes: design.nodes.map((n) =>
          n.phaseId === action.id ? { ...n, phaseId: fallback } : n,
        ),
        decisionPoints: design.decisionPoints.filter(
          (dp) => dp.afterPhaseId !== action.id,
        ),
      };
    }
    case "movePhase": {
      const idx = design.phases.findIndex((p) => p.id === action.id);
      const next = idx + action.direction;
      if (idx < 0 || next < 0 || next >= design.phases.length) return design;
      const phases = [...design.phases];
      const [item] = phases.splice(idx, 1);
      phases.splice(next, 0, item);
      return { ...design, phases };
    }
    case "addLoe": {
      const color = LOE_COLORS[design.linesOfEffort.length % LOE_COLORS.length];
      return {
        ...design,
        linesOfEffort: [
          ...design.linesOfEffort,
          {
            id: action.id ?? uid("loe"),
            name: `LoE ${design.linesOfEffort.length + 1}`,
            color,
          },
        ],
      };
    }
    case "updateLoe":
      return {
        ...design,
        linesOfEffort: design.linesOfEffort.map((l) =>
          l.id === action.id
            ? {
                ...l,
                name: action.name ?? l.name,
                color: action.color ?? l.color,
              }
            : l,
        ),
      };
    case "removeLoe": {
      if (design.linesOfEffort.length <= 1) return design;
      const removed = new Set(
        design.nodes.filter((n) => n.loeId === action.id).map((n) => n.id),
      );
      return {
        ...design,
        linesOfEffort: design.linesOfEffort.filter((l) => l.id !== action.id),
        nodes: design.nodes.filter((n) => n.loeId !== action.id),
        dependencies: withoutNodeDeps(design, removed),
      };
    }
    case "moveLoe": {
      const idx = design.linesOfEffort.findIndex((l) => l.id === action.id);
      const next = idx + action.direction;
      if (idx < 0 || next < 0 || next >= design.linesOfEffort.length) {
        return design;
      }
      const linesOfEffort = [...design.linesOfEffort];
      const [item] = linesOfEffort.splice(idx, 1);
      linesOfEffort.splice(next, 0, item);
      return { ...design, linesOfEffort };
    }
    case "addNode":
      return {
        ...design,
        nodes: [
          ...design.nodes,
          {
            id: action.id ?? uid("n"),
            kind: action.kind,
            loeId: action.loeId,
            phaseId: action.phaseId,
            label: action.label ?? nextLabel(design, action.loeId, action.kind),
            description: "",
            order: nextOrder(design, action.loeId, action.phaseId),
          },
        ],
      };
    case "updateNode":
      return {
        ...design,
        nodes: design.nodes.map((n) =>
          n.id === action.id
            ? {
                ...n,
                label: action.label ?? n.label,
                description: action.description ?? n.description,
                loeId: action.loeId ?? n.loeId,
                phaseId: action.phaseId ?? n.phaseId,
                kind: action.kind ?? n.kind,
                order:
                  (action.phaseId && action.phaseId !== n.phaseId) ||
                  (action.loeId && action.loeId !== n.loeId)
                    ? nextOrder(
                        design,
                        action.loeId ?? n.loeId,
                        action.phaseId ?? n.phaseId,
                      )
                    : n.order,
              }
            : n,
        ),
      };
    case "removeNode":
      return {
        ...design,
        nodes: design.nodes.filter((n) => n.id !== action.id),
        dependencies: withoutNodeDeps(design, new Set([action.id])),
      };
    case "placeNode": {
      const moving = design.nodes.find((n) => n.id === action.id);
      if (!moving) return design;
      const siblings = nodesInCell(design, moving.loeId, action.phaseId)
        .filter((n) => n.id !== action.id)
        .sort((a, b) => a.order - b.order);
      const clamped = Math.max(0, Math.min(action.order, siblings.length));
      siblings.splice(clamped, 0, { ...moving, phaseId: action.phaseId });
      const reordered = siblings.map((n, i) => ({
        ...n,
        order: i,
        phaseId: action.phaseId,
      }));
      const byId = new Map(reordered.map((n) => [n.id, n]));
      return {
        ...design,
        nodes: design.nodes.map((n) => byId.get(n.id) ?? n),
      };
    }
    case "addDependency": {
      if (
        hasDependency(design.dependencies, action.fromId, action.toId) ||
        wouldCreateCycle(design.dependencies, action.fromId, action.toId)
      ) {
        return design;
      }
      const from = design.nodes.some((n) => n.id === action.fromId);
      const to = design.nodes.some((n) => n.id === action.toId);
      if (!from || !to) return design;
      return {
        ...design,
        dependencies: [
          ...design.dependencies,
          {
            id: action.id ?? uid("dep"),
            fromId: action.fromId,
            toId: action.toId,
          },
        ],
      };
    }
    case "removeDependency":
      return {
        ...design,
        dependencies: design.dependencies.filter((d) => d.id !== action.id),
      };
    case "addDp":
      return {
        ...design,
        decisionPoints: [
          ...design.decisionPoints,
          {
            id: action.id ?? uid("dp"),
            label: `Gate ${design.decisionPoints.length + 1}`,
            afterPhaseId: action.afterPhaseId,
            description: "",
          },
        ],
      };
    case "updateDp":
      return {
        ...design,
        decisionPoints: design.decisionPoints.map((dp) =>
          dp.id === action.id
            ? {
                ...dp,
                label: action.label ?? dp.label,
                description: action.description ?? dp.description,
                afterPhaseId: action.afterPhaseId ?? dp.afterPhaseId,
              }
            : dp,
        ),
      };
    case "removeDp":
      return {
        ...design,
        decisionPoints: design.decisionPoints.filter((dp) => dp.id !== action.id),
      };
    default:
      return design;
  }
}

export function selectionAfter(
  design: OperationalDesign,
  selection: Selection,
): Selection {
  if (!selection) return null;
  switch (selection.type) {
    case "phase":
      return design.phases.some((p) => p.id === selection.id) ? selection : null;
    case "loe":
      return design.linesOfEffort.some((l) => l.id === selection.id)
        ? selection
        : null;
    case "node":
      return design.nodes.some((n) => n.id === selection.id) ? selection : null;
    case "dp":
      return design.decisionPoints.some((d) => d.id === selection.id)
        ? selection
        : null;
    case "dependency":
      return design.dependencies.some((d) => d.id === selection.id)
        ? selection
        : null;
    default:
      return selection;
  }
}
