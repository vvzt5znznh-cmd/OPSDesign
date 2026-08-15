import type { ReactNode } from "react";
import { nodeKindLabel } from "./design";
import { useDesign } from "./state";
import { LOE_COLORS } from "./types";

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Inspector() {
  const { design, selection, dispatch } = useDesign();

  if (!selection) {
    return (
      <aside className="inspector">
        <h2>Inspector</h2>
        <p className="muted">
          Click a phase, line of effort, {nodeKindLabel(design.nodeKind).toLowerCase()},
          decision point, or the end state to edit it.
        </p>
        <ul className="tips">
          <li>Hover a LoE inside a phase and click + to add a node.</li>
          <li>Drag nodes along their line of effort to move them.</li>
          <li>Delete or Backspace removes the selection.</li>
          <li>⌘Z / Ctrl+Z undoes; Shift+⌘Z redoes.</li>
        </ul>
      </aside>
    );
  }

  if (selection.type === "title") {
    return (
      <aside className="inspector">
        <h2>Operation title</h2>
        <Field label="Title">
          <input
            key={design.id}
            defaultValue={design.title}
            onBlur={(e) => dispatch({ type: "setTitle", title: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
          />
        </Field>
      </aside>
    );
  }

  if (selection.type === "endState") {
    return (
      <aside className="inspector">
        <h2>End state</h2>
        <Field label="Name">
          <input
            key="es-name"
            defaultValue={design.endState.name}
            onBlur={(e) => dispatch({ type: "setEndState", name: e.target.value })}
          />
        </Field>
        <Field label="Description">
          <textarea
            key="es-desc"
            rows={5}
            defaultValue={design.endState.description}
            onBlur={(e) =>
              dispatch({ type: "setEndState", description: e.target.value })
            }
            placeholder="The conditions that must hold when the operation is complete."
          />
        </Field>
      </aside>
    );
  }

  if (selection.type === "phase") {
    const phase = design.phases.find((p) => p.id === selection.id);
    if (!phase) return null;
    const idx = design.phases.findIndex((p) => p.id === phase.id);
    return (
      <aside className="inspector">
        <h2>Phase</h2>
        <Field label="Name">
          <input
            key={phase.id}
            defaultValue={phase.name}
            onBlur={(e) =>
              dispatch({ type: "renamePhase", id: phase.id, name: e.target.value })
            }
          />
        </Field>
        <div className="btn-row">
          <button
            type="button"
            disabled={idx === 0}
            onClick={() => dispatch({ type: "movePhase", id: phase.id, direction: -1 })}
          >
            ← Earlier
          </button>
          <button
            type="button"
            disabled={idx === design.phases.length - 1}
            onClick={() => dispatch({ type: "movePhase", id: phase.id, direction: 1 })}
          >
            Later →
          </button>
        </div>
        <button
          type="button"
          className="danger"
          disabled={design.phases.length <= 1}
          onClick={() => dispatch({ type: "removePhase", id: phase.id })}
        >
          Remove phase
        </button>
      </aside>
    );
  }

  if (selection.type === "loe") {
    const loe = design.linesOfEffort.find((l) => l.id === selection.id);
    if (!loe) return null;
    const idx = design.linesOfEffort.findIndex((l) => l.id === loe.id);
    return (
      <aside className="inspector">
        <h2>Line of effort</h2>
        <Field label="Name">
          <input
            key={loe.id}
            defaultValue={loe.name}
            onBlur={(e) =>
              dispatch({ type: "updateLoe", id: loe.id, name: e.target.value })
            }
          />
        </Field>
        <Field label="Colour">
          <div className="palette">
            {LOE_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={color === loe.color ? "swatch-btn on" : "swatch-btn"}
                style={{ background: color }}
                aria-label={color}
                onClick={() => dispatch({ type: "updateLoe", id: loe.id, color })}
              />
            ))}
          </div>
        </Field>
        <div className="btn-row">
          <button
            type="button"
            disabled={idx === 0}
            onClick={() => dispatch({ type: "moveLoe", id: loe.id, direction: -1 })}
          >
            ↑ Up
          </button>
          <button
            type="button"
            disabled={idx === design.linesOfEffort.length - 1}
            onClick={() => dispatch({ type: "moveLoe", id: loe.id, direction: 1 })}
          >
            ↓ Down
          </button>
        </div>
        <button
          type="button"
          className="danger"
          disabled={design.linesOfEffort.length <= 1}
          onClick={() => dispatch({ type: "removeLoe", id: loe.id })}
        >
          Remove LoE
        </button>
      </aside>
    );
  }

  if (selection.type === "condition") {
    const c = design.conditions.find((x) => x.id === selection.id);
    if (!c) return null;
    return (
      <aside className="inspector">
        <h2>{nodeKindLabel(design.nodeKind)}</h2>
        <Field label="Label">
          <input
            key={c.id}
            defaultValue={c.label}
            onBlur={(e) =>
              dispatch({ type: "updateCondition", id: c.id, label: e.target.value })
            }
          />
        </Field>
        <Field label="Description">
          <textarea
            key={`${c.id}-d`}
            rows={4}
            defaultValue={c.description}
            onBlur={(e) =>
              dispatch({
                type: "updateCondition",
                id: c.id,
                description: e.target.value,
              })
            }
          />
        </Field>
        <Field label="Line of effort">
          <select
            value={c.loeId}
            onChange={(e) =>
              dispatch({
                type: "updateCondition",
                id: c.id,
                loeId: e.target.value,
              })
            }
          >
            {design.linesOfEffort.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Phase">
          <select
            value={c.phaseId}
            onChange={(e) =>
              dispatch({
                type: "updateCondition",
                id: c.id,
                phaseId: e.target.value,
              })
            }
          >
            {design.phases.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <button
          type="button"
          className="danger"
          onClick={() => dispatch({ type: "removeCondition", id: c.id })}
        >
          Remove
        </button>
      </aside>
    );
  }

  if (selection.type === "dp") {
    const dp = design.decisionPoints.find((d) => d.id === selection.id);
    if (!dp) return null;
    return (
      <aside className="inspector">
        <h2>Decision point</h2>
        <Field label="Label">
          <input
            key={dp.id}
            defaultValue={dp.label}
            onBlur={(e) =>
              dispatch({ type: "updateDp", id: dp.id, label: e.target.value })
            }
          />
        </Field>
        <Field label="Description">
          <textarea
            key={`${dp.id}-d`}
            rows={4}
            defaultValue={dp.description}
            placeholder="What must be decided here?"
            onBlur={(e) =>
              dispatch({
                type: "updateDp",
                id: dp.id,
                description: e.target.value,
              })
            }
          />
        </Field>
        <Field label="After phase">
          <select
            value={dp.afterPhaseId}
            onChange={(e) =>
              dispatch({
                type: "updateDp",
                id: dp.id,
                afterPhaseId: e.target.value,
              })
            }
          >
            {design.phases.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <button
          type="button"
          className="danger"
          onClick={() => dispatch({ type: "removeDp", id: dp.id })}
        >
          Remove
        </button>
      </aside>
    );
  }

  return null;
}
