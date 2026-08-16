import { hasDependency, nextLabel, nextOrder, wouldCreateCycle } from "./design";
import { uid } from "./id";
import { nodeColumns } from "./layout";
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
  | { type: "setEndState"; name?: string; description?: string; color?: string }
  | { type: "addPhase"; afterId?: string; id?: string }
  | { type: "renamePhase"; id: string; name: string }
  | { type: "removePhase"; id: string }
  | { type: "movePhase"; id: string; direction: -1 | 1 }
  | { type: "addLoe"; id?: string }
  | { type: "updateLoe"; id: string; name?: string; color?: string; purpose?: string }
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
  | { type: "addDp"; afterPhaseId: string; id?: string; placement?: "in" | "after"; order?: number }
  | {
      type: "updateDp";
      id: string;
      label?: string;
      description?: string;
      afterPhaseId?: string;
      placement?: "in" | "after";
      order?: number;
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
      return action.title === design.title ? design : { ...design, title: action.title };
    case "setPurpose":
      return action.purpose === design.purpose
        ? design
        : { ...design, purpose: action.purpose };
    case "setEndState": {
      const name = action.name ?? design.endState.name;
      const description = action.description ?? design.endState.description;
      const color = action.color ?? design.endState.color;
      if (
        name === design.endState.name &&
        description === design.endState.description &&
        color === design.endState.color
      ) {
        return design;
      }
      return { ...design, endState: { name, description, color } };
    }
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
      return { ...design, phases };
    }
    case "renamePhase": {
      const phase = design.phases.find((p) => p.id === action.id);
      if (!phase || phase.name === action.name) return design;
      return {
        ...design,
        phases: design.phases.map((p) =>
          p.id === action.id ? { ...p, name: action.name } : p,
        ),
      };
    }
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
            name: `Workstream ${design.linesOfEffort.length + 1}`,
            color,
            purpose: "",
          },
        ],
      };
    }
    case "updateLoe": {
      const loe = design.linesOfEffort.find((l) => l.id === action.id);
      if (!loe) return design;
      const name = action.name ?? loe.name;
      const color = action.color ?? loe.color;
      const purpose = action.purpose ?? loe.purpose;
      if (name === loe.name && color === loe.color && purpose === loe.purpose) {
        return design;
      }
      return {
        ...design,
        linesOfEffort: design.linesOfEffort.map((l) =>
          l.id === action.id ? { ...l, name, color, purpose } : l,
        ),
      };
    }
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
    case "updateNode": {
      const node = design.nodes.find((n) => n.id === action.id);
      if (!node) return design;
      const label = action.label ?? node.label;
      const description = action.description ?? node.description;
      const loeId = action.loeId ?? node.loeId;
      const phaseId = action.phaseId ?? node.phaseId;
      const kind = action.kind ?? node.kind;
      const moved = loeId !== node.loeId || phaseId !== node.phaseId;
      if (
        label === node.label &&
        description === node.description &&
        kind === node.kind &&
        !moved
      ) {
        return design;
      }
      return {
        ...design,
        nodes: design.nodes.map((n) =>
          n.id === action.id
            ? {
                ...n,
                label,
                description,
                loeId,
                phaseId,
                kind,
                order: moved
                  ? nextOrder(design, loeId, phaseId)
                  : n.order,
              }
            : n,
        ),
      };
    }
    case "removeNode":
      if (!design.nodes.some((n) => n.id === action.id)) return design;
      return {
        ...design,
        nodes: design.nodes.filter((n) => n.id !== action.id),
        dependencies: withoutNodeDeps(design, new Set([action.id])),
      };
    case "placeNode": {
      const moving = design.nodes.find((n) => n.id === action.id);
      if (!moving) return design;
      const order = Math.max(0, Math.floor(action.order));
      if (moving.phaseId === action.phaseId && moving.order === order) {
        return design;
      }
      const nodes = design.nodes.map((n) => {
        if (n.id === moving.id) {
          return { ...n, phaseId: action.phaseId, order };
        }
        return n;
      });
      const line = nodes
        .filter(
          (n) =>
            n.id !== moving.id &&
            n.loeId === moving.loeId &&
            n.phaseId === action.phaseId,
        )
        .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
      const shifted = new Map<string, number>();
      let next = order;
      for (const s of line) {
        if (s.order < next) continue;
        if (s.order === next) {
          next += 1;
          shifted.set(s.id, next);
        } else {
          break;
        }
      }
      return {
        ...design,
        nodes: nodes.map((n) =>
          shifted.has(n.id) ? { ...n, order: shifted.get(n.id)! } : n,
        ),
      };
    }
    case "addDependency": {
      if (
        hasDependency(design.dependencies, action.fromId, action.toId) ||
        wouldCreateCycle(design.dependencies, action.fromId, action.toId)
      ) {
        return design;
      }
      const fromNode = design.nodes.find((n) => n.id === action.fromId);
      const toNode = design.nodes.find((n) => n.id === action.toId);
      if (!fromNode || !toNode) return design;
      const dependencies = [
        ...design.dependencies,
        {
          id: action.id ?? uid("dep"),
          fromId: action.fromId,
          toId: action.toId,
        },
      ];
      const cols = nodeColumns({ ...design, dependencies });
      const toCol = cols.get(toNode.id) ?? toNode.order;
      return {
        ...design,
        dependencies,
        nodes:
          toCol > toNode.order
            ? design.nodes.map((n) =>
                n.id === toNode.id ? { ...n, order: toCol } : n,
              )
            : design.nodes,
      };
    }
    case "removeDependency":
      if (!design.dependencies.some((d) => d.id === action.id)) return design;
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
            label: `Decision ${design.decisionPoints.length + 1}`,
            afterPhaseId: action.afterPhaseId,
            placement: action.placement ?? "after",
            order: action.order ?? 0,
            description: "",
          },
        ],
      };
    case "updateDp": {
      const dp = design.decisionPoints.find((d) => d.id === action.id);
      if (!dp) return design;
      const label = action.label ?? dp.label;
      const description = action.description ?? dp.description;
      const afterPhaseId = action.afterPhaseId ?? dp.afterPhaseId;
      const placement = action.placement ?? dp.placement ?? "after";
      const order = action.order ?? dp.order ?? 0;
      if (
        label === dp.label &&
        description === dp.description &&
        afterPhaseId === dp.afterPhaseId &&
        placement === dp.placement &&
        order === dp.order
      ) {
        return design;
      }
      return {
        ...design,
        decisionPoints: design.decisionPoints.map((item) =>
          item.id === action.id
            ? { ...item, label, description, afterPhaseId, placement, order }
            : item,
        ),
      };
    }
    case "removeDp":
      if (!design.decisionPoints.some((d) => d.id === action.id)) return design;
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
