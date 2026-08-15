import type { ReactNode } from "react";
import { nodeKindLabel } from "./design";
import { uid } from "./id";
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
  const { design, selection, dispatch, setLinkMode, setLinkFrom } = useDesign();

  if (!selection) {
    return (
      <aside className="inspector">
        <h2>Properties</h2>
        <p className="lede-sm">Click anything on the picture to edit it here.</p>
        <ol className="how">
          <li>Hover a coloured line in a phase.</li>
          <li>Add a milestone (event) or a condition (state).</li>
          <li>
            Press <strong>Link</strong>, then click A then B.
          </li>
        </ol>
        <div className="legend-card">
          <p>
            <span className="mark triangle" /> Milestone — an event
          </p>
          <p>
            <span className="mark diamond" /> Condition — a state that must hold
          </p>
          <p>
            <span className="star">★</span> Gate — a decision
          </p>
          <p className="dep-key">— — Dependency</p>
        </div>
      </aside>
    );
  }

  if (selection.type === "title") {
    return (
      <aside className="inspector">
        <h2>Project</h2>
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
        <Field label="Purpose">
          <textarea
            key={`${design.id}-purpose`}
            rows={3}
            defaultValue={design.purpose}
            placeholder="What this work is for, in one sentence."
            onBlur={(e) =>
              dispatch({ type: "setPurpose", purpose: e.target.value })
            }
          />
        </Field>
      </aside>
    );
  }

  if (selection.type === "endState") {
    return (
      <aside className="inspector">
        <h2>End state</h2>
        <p className="muted">
          The outcome that must hold when the work is done — a set of
          conditions, not a date.
        </p>
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
            placeholder="What will be true for users, the organisation, and residual risk?"
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
        <h2>Phase (stage)</h2>
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
        <h2>Workstream</h2>
        <p className="muted">A line of effort — concurrent work organised by purpose.</p>
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
          Remove workstream
        </button>
      </aside>
    );
  }

  if (selection.type === "node") {
    const n = design.nodes.find((x) => x.id === selection.id);
    if (!n) return null;
    const incoming = design.dependencies.filter((d) => d.toId === n.id);
    const outgoing = design.dependencies.filter((d) => d.fromId === n.id);
    const others = design.nodes.filter((x) => x.id !== n.id);
    return (
      <aside className="inspector">
        <h2>{nodeKindLabel(n.kind)}</h2>
        <div className="kind-toggle inspector-toggle">
          <button
            type="button"
            className={n.kind === "milestone" ? "on" : ""}
            onClick={() =>
              dispatch({ type: "updateNode", id: n.id, kind: "milestone" })
            }
          >
            Milestone
          </button>
          <button
            type="button"
            className={n.kind === "condition" ? "on" : ""}
            onClick={() =>
              dispatch({ type: "updateNode", id: n.id, kind: "condition" })
            }
          >
            Condition
          </button>
        </div>
        <p className="muted">
          {n.kind === "milestone"
            ? "An event or deliverable."
            : "A state that must hold to reach the end state."}
        </p>
        <Field label="Label">
          <input
            key={n.id}
            autoFocus
            defaultValue={n.label}
            onBlur={(e) =>
              dispatch({ type: "updateNode", id: n.id, label: e.target.value })
            }
          />
        </Field>
        <Field label="Description">
          <textarea
            key={`${n.id}-d`}
            rows={3}
            defaultValue={n.description}
            onBlur={(e) =>
              dispatch({
                type: "updateNode",
                id: n.id,
                description: e.target.value,
              })
            }
          />
        </Field>
        <Field label="Line of effort">
          <select
            value={n.loeId}
            onChange={(e) =>
              dispatch({ type: "updateNode", id: n.id, loeId: e.target.value })
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
            value={n.phaseId}
            onChange={(e) =>
              dispatch({ type: "updateNode", id: n.id, phaseId: e.target.value })
            }
          >
            {design.phases.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Depends on">
          <select
            value=""
            onChange={(e) => {
              if (!e.target.value) return;
              dispatch({
                type: "addDependency",
                id: uid("dep"),
                fromId: e.target.value,
                toId: n.id,
              });
            }}
          >
            <option value="">Add a predecessor…</option>
            {others.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        {incoming.length > 0 && (
          <ul className="dep-list">
            {incoming.map((d) => {
              const from = design.nodes.find((x) => x.id === d.fromId);
              return (
                <li key={d.id}>
                  <span>{from?.label ?? "Unknown"}</span>
                  <button
                    type="button"
                    className="tiny"
                    onClick={() => dispatch({ type: "removeDependency", id: d.id })}
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {outgoing.length > 0 && (
          <>
            <p className="field-label">This enables</p>
            <ul className="dep-list">
              {outgoing.map((d) => {
                const to = design.nodes.find((x) => x.id === d.toId);
                return (
                  <li key={d.id}>
                    <span>{to?.label ?? "Unknown"}</span>
                    <button
                      type="button"
                      className="tiny"
                      onClick={() =>
                        dispatch({ type: "removeDependency", id: d.id })
                      }
                    >
                      Remove
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
        <button
          type="button"
          onClick={() => {
            setLinkMode(true);
            setLinkFrom(n.id);
          }}
        >
          Draw link from here
        </button>
        <button
          type="button"
          className="danger"
          onClick={() => dispatch({ type: "removeNode", id: n.id })}
        >
          Remove
        </button>
      </aside>
    );
  }

  if (selection.type === "dependency") {
    const dep = design.dependencies.find((d) => d.id === selection.id);
    if (!dep) return null;
    const from = design.nodes.find((n) => n.id === dep.fromId);
    const to = design.nodes.find((n) => n.id === dep.toId);
    return (
      <aside className="inspector">
        <h2>Dependency</h2>
        <p className="muted">
          {from?.label ?? "From"} must be true or complete before {to?.label ?? "to"}.
        </p>
        <button
          type="button"
          className="danger"
          onClick={() => dispatch({ type: "removeDependency", id: dep.id })}
        >
          Remove link
        </button>
      </aside>
    );
  }

  if (selection.type === "dp") {
    const dp = design.decisionPoints.find((d) => d.id === selection.id);
    if (!dp) return null;
    return (
      <aside className="inspector">
        <h2>Decision point (gate)</h2>
        <p className="muted">A go / recycle / stop choice, usually between stages.</p>
        <Field label="Label">
          <input
            key={dp.id}
            defaultValue={dp.label}
            onBlur={(e) =>
              dispatch({ type: "updateDp", id: dp.id, label: e.target.value })
            }
          />
        </Field>
        <Field label="What is being decided?">
          <textarea
            key={`${dp.id}-d`}
            rows={4}
            defaultValue={dp.description}
            placeholder="Proceed to the next stage? On what evidence?"
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
