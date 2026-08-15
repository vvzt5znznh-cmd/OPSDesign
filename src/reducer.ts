import { conditionsInCell, nextOrder } from "./design";
import { uid } from "./id";
import { LOE_COLORS, type OperationalDesign, type Selection } from "./types";

export type DesignAction =
  | { type: "replace"; design: OperationalDesign }
  | { type: "setTitle"; title: string }
  | { type: "setEndState"; name?: string; description?: string }
  | { type: "setNodeKind"; nodeKind: OperationalDesign["nodeKind"] }
  | { type: "addPhase"; afterId?: string; id?: string }
  | { type: "renamePhase"; id: string; name: string }
  | { type: "removePhase"; id: string }
  | { type: "movePhase"; id: string; direction: -1 | 1 }
  | { type: "addLoe"; id?: string }
  | { type: "updateLoe"; id: string; name?: string; color?: string }
  | { type: "removeLoe"; id: string }
  | { type: "moveLoe"; id: string; direction: -1 | 1 }
  | { type: "addCondition"; loeId: string; phaseId: string; label?: string; id?: string }
  | { type: "updateCondition"; id: string; label?: string; description?: string; loeId?: string; phaseId?: string }
  | { type: "removeCondition"; id: string }
  | { type: "placeCondition"; id: string; phaseId: string; order: number }
  | { type: "addDp"; afterPhaseId: string; id?: string }
  | { type: "updateDp"; id: string; label?: string; description?: string; afterPhaseId?: string }
  | { type: "removeDp"; id: string };

export function reduceDesign(
  design: OperationalDesign,
  action: DesignAction,
): OperationalDesign {
  switch (action.type) {
    case "replace":
      return action.design;
    case "setTitle":
      return { ...design, title: action.title };
    case "setEndState":
      return {
        ...design,
        endState: {
          name: action.name ?? design.endState.name,
          description: action.description ?? design.endState.description,
        },
      };
    case "setNodeKind":
      return { ...design, nodeKind: action.nodeKind };
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
                label: `DP${design.decisionPoints.length + 1}`,
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
        conditions: design.conditions.map((c) =>
          c.phaseId === action.id ? { ...c, phaseId: fallback } : c,
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
      return {
        ...design,
        linesOfEffort: design.linesOfEffort.filter((l) => l.id !== action.id),
        conditions: design.conditions.filter((c) => c.loeId !== action.id),
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
    case "addCondition": {
      const short = design.nodeKind === "milestone" ? "M" : "DC";
      const onLoe = design.conditions.filter((c) => c.loeId === action.loeId);
      const n = onLoe.length + 1;
      return {
        ...design,
        conditions: [
          ...design.conditions,
          {
            id: action.id ?? uid("c"),
            loeId: action.loeId,
            phaseId: action.phaseId,
            label: action.label ?? `${short}${n}`,
            description: "",
            order: nextOrder(design, action.loeId, action.phaseId),
          },
        ],
      };
    }
    case "updateCondition":
      return {
        ...design,
        conditions: design.conditions.map((c) =>
          c.id === action.id
            ? {
                ...c,
                label: action.label ?? c.label,
                description: action.description ?? c.description,
                loeId: action.loeId ?? c.loeId,
                phaseId: action.phaseId ?? c.phaseId,
                order:
                  (action.phaseId && action.phaseId !== c.phaseId) ||
                  (action.loeId && action.loeId !== c.loeId)
                    ? nextOrder(
                        design,
                        action.loeId ?? c.loeId,
                        action.phaseId ?? c.phaseId,
                      )
                    : c.order,
              }
            : c,
        ),
      };
    case "removeCondition":
      return {
        ...design,
        conditions: design.conditions.filter((c) => c.id !== action.id),
      };
    case "placeCondition": {
      const moving = design.conditions.find((c) => c.id === action.id);
      if (!moving) return design;
      const siblings = conditionsInCell(design, moving.loeId, action.phaseId)
        .filter((c) => c.id !== action.id)
        .sort((a, b) => a.order - b.order);
      const clamped = Math.max(0, Math.min(action.order, siblings.length));
      siblings.splice(clamped, 0, { ...moving, phaseId: action.phaseId });
      const reordered = siblings.map((c, i) => ({ ...c, order: i, phaseId: action.phaseId }));
      const byId = new Map(reordered.map((c) => [c.id, c]));
      return {
        ...design,
        conditions: design.conditions.map((c) => byId.get(c.id) ?? c),
      };
    }
    case "addDp":
      return {
        ...design,
        decisionPoints: [
          ...design.decisionPoints,
          {
            id: action.id ?? uid("dp"),
            label: `DP${design.decisionPoints.length + 1}`,
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
    case "condition":
      return design.conditions.some((c) => c.id === selection.id)
        ? selection
        : null;
    case "dp":
      return design.decisionPoints.some((d) => d.id === selection.id)
        ? selection
        : null;
    default:
      return selection;
  }
}
