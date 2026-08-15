import { uid } from "./id";
import { sortNodes } from "./design";
import { useDesign } from "./state";
import type { NodeKind } from "./types";

export function Sidebar() {
  const { design, selection, setSelection, dispatch } = useDesign();

  function targetCell() {
    const selectedNode =
      selection?.type === "node"
        ? design.nodes.find((n) => n.id === selection.id)
        : null;
    const loeId =
      (selection?.type === "loe" && selection.id) ||
      selectedNode?.loeId ||
      design.linesOfEffort[0]?.id;
    const phaseId =
      (selection?.type === "phase" && selection.id) ||
      selectedNode?.phaseId ||
      design.phases[0]?.id;
    return { loeId, phaseId };
  }

  function addPhase() {
    const id = uid("ph");
    dispatch({ type: "addPhase", id });
    setSelection({ type: "phase", id });
  }

  function addLoe() {
    const id = uid("loe");
    dispatch({ type: "addLoe", id });
    setSelection({ type: "loe", id });
  }

  function addNode(kind: NodeKind) {
    const { loeId, phaseId } = targetCell();
    if (!loeId || !phaseId) return;
    const id = uid("n");
    dispatch({ type: "addNode", id, loeId, phaseId, kind });
    setSelection({ type: "node", id });
  }

  function addDp() {
    const afterPhaseId =
      (selection?.type === "phase" && selection.id) ||
      design.phases[Math.max(0, design.phases.length - 2)]?.id ||
      design.phases[0]?.id;
    if (!afterPhaseId) return;
    const id = uid("dp");
    dispatch({ type: "addDp", id, afterPhaseId });
    setSelection({ type: "dp", id });
  }

  const milestones = sortNodes(design).filter((n) => n.kind === "milestone");
  const conditions = sortNodes(design).filter((n) => n.kind === "condition");

  return (
    <aside className="sidebar">
      <div className="quick-add">
        <button type="button" onClick={addPhase}>
          + Phase
        </button>
        <button type="button" onClick={addLoe}>
          + LoE
        </button>
        <button type="button" onClick={() => addNode("milestone")}>
          + Milestone
        </button>
        <button type="button" onClick={() => addNode("condition")}>
          + Condition
        </button>
        <button type="button" onClick={addDp}>
          + Gate
        </button>
      </div>

      <section>
        <h2>End state</h2>
        <button
          type="button"
          className={selection?.type === "endState" ? "row selected" : "row"}
          onClick={() => setSelection({ type: "endState" })}
        >
          <span className="swatch end" />
          <span className="row-label">{design.endState.name}</span>
        </button>
      </section>

      <section>
        <h2>Phases</h2>
        <ol className="stack">
          {design.phases.map((phase) => (
            <li key={phase.id}>
              <button
                type="button"
                className={
                  selection?.type === "phase" && selection.id === phase.id
                    ? "row selected"
                    : "row"
                }
                onClick={() => setSelection({ type: "phase", id: phase.id })}
              >
                <span className="row-label">{phase.name}</span>
              </button>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2>Lines of effort</h2>
        <ol className="stack">
          {design.linesOfEffort.map((loe) => (
            <li key={loe.id}>
              <button
                type="button"
                className={
                  selection?.type === "loe" && selection.id === loe.id
                    ? "row selected"
                    : "row"
                }
                onClick={() => setSelection({ type: "loe", id: loe.id })}
              >
                <span className="swatch" style={{ background: loe.color }} />
                <span className="row-label">{loe.name}</span>
              </button>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2>Decision points (gates)</h2>
        {design.decisionPoints.length === 0 ? (
          <p className="muted">None yet. Add one at a phase boundary.</p>
        ) : (
          <ol className="stack">
            {design.decisionPoints.map((dp) => (
              <li key={dp.id}>
                <button
                  type="button"
                  className={
                    selection?.type === "dp" && selection.id === dp.id
                      ? "row selected"
                      : "row"
                  }
                  onClick={() => setSelection({ type: "dp", id: dp.id })}
                >
                  <span className="star">★</span>
                  <span className="row-label">{dp.label}</span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      <NodeList
        title="Milestones"
        empty="Hover a line of effort and click △ to add one."
        nodes={milestones}
      />
      <NodeList
        title="Conditions"
        empty="Hover a line of effort and click ◇ to add one."
        nodes={conditions}
      />

      <p className="hint">Click a row to edit it in the inspector.</p>
    </aside>
  );
}

function NodeList({
  title,
  empty,
  nodes,
}: {
  title: string;
  empty: string;
  nodes: { id: string; label: string; loeId: string }[];
}) {
  const { design, selection, setSelection } = useDesign();
  return (
    <section>
      <h2>{title}</h2>
      {nodes.length === 0 ? (
        <p className="muted">{empty}</p>
      ) : (
        <ol className="stack compact">
          {nodes.map((n) => {
            const loe = design.linesOfEffort.find((l) => l.id === n.loeId);
            return (
              <li key={n.id}>
                <button
                  type="button"
                  className={
                    selection?.type === "node" && selection.id === n.id
                      ? "row selected"
                      : "row"
                  }
                  onClick={() => setSelection({ type: "node", id: n.id })}
                >
                  <span
                    className="swatch sm"
                    style={{ background: loe?.color ?? "#999" }}
                  />
                  <span className="row-label">{n.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
