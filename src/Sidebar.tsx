import { uid } from "./id";
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

  return (
    <aside className="sidebar">
      <p className="sidebar-kicker">Add to the picture</p>
      <div className="add-stack">
        <button type="button" className="add-row" onClick={() => addNode("milestone")}>
          <span className="mark triangle" />
          Milestone
        </button>
        <button type="button" className="add-row" onClick={() => addNode("condition")}>
          <span className="mark diamond" />
          Condition
        </button>
      </div>
      <p className="hint">
        Drops onto the selected workstream and phase — or hover the diagram to
        place one exactly.
      </p>

      <section>
        <div className="section-head">
          <h2>End state</h2>
        </div>
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
        <div className="section-head">
          <h2>Phases</h2>
          <button type="button" className="icon-add" onClick={addPhase} title="Add phase">
            +
          </button>
        </div>
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
        <div className="section-head">
          <h2>Workstreams</h2>
          <button type="button" className="icon-add" onClick={addLoe} title="Add line of effort">
            +
          </button>
        </div>
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
        <div className="section-head">
          <h2>Gates</h2>
          <button type="button" className="icon-add" onClick={addDp} title="Add gate">
            +
          </button>
        </div>
        {design.decisionPoints.length === 0 ? (
          <p className="muted">None yet.</p>
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
    </aside>
  );
}
