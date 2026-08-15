import { uid } from "./id";
import { nodeKindLabel } from "./design";
import { useDesign } from "./state";

export function Sidebar() {
  const { design, selection, setSelection, dispatch } = useDesign();
  const kind = nodeKindLabel(design.nodeKind, true);

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

  function addCondition() {
    const loeId =
      (selection?.type === "loe" && selection.id) ||
      (selection?.type === "condition"
        ? design.conditions.find((c) => c.id === selection.id)?.loeId
        : null) ||
      design.linesOfEffort[0]?.id;
    const phaseId =
      (selection?.type === "phase" && selection.id) ||
      (selection?.type === "condition"
        ? design.conditions.find((c) => c.id === selection.id)?.phaseId
        : null) ||
      design.phases[0]?.id;
    if (!loeId || !phaseId) return;
    const id = uid("c");
    dispatch({ type: "addCondition", id, loeId, phaseId });
    setSelection({ type: "condition", id });
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
      <div className="quick-add">
        <button type="button" onClick={addPhase}>
          + Phase
        </button>
        <button type="button" onClick={addLoe}>
          + LoE
        </button>
        <button type="button" onClick={addCondition}>
          + {nodeKindLabel(design.nodeKind)}
        </button>
        <button type="button" onClick={addDp}>
          + DP
        </button>
      </div>

      <section>
        <h2>End state</h2>
        <button
          type="button"
          className={
            selection?.type === "endState" ? "row selected" : "row"
          }
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
        <h2>Decision points</h2>
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

      <section>
        <h2>{kind}</h2>
        {design.conditions.length === 0 ? (
          <p className="muted">
            Hover a line of effort in a phase and click + to add one.
          </p>
        ) : (
          <ol className="stack compact">
            {design.conditions
              .slice()
              .sort((a, b) => {
                const pa = design.phases.findIndex((p) => p.id === a.phaseId);
                const pb = design.phases.findIndex((p) => p.id === b.phaseId);
                if (a.loeId !== b.loeId) {
                  const la = design.linesOfEffort.findIndex((l) => l.id === a.loeId);
                  const lb = design.linesOfEffort.findIndex((l) => l.id === b.loeId);
                  return la - lb;
                }
                if (pa !== pb) return pa - pb;
                return a.order - b.order;
              })
              .map((c) => {
                const loe = design.linesOfEffort.find((l) => l.id === c.loeId);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      className={
                        selection?.type === "condition" && selection.id === c.id
                          ? "row selected"
                          : "row"
                      }
                      onClick={() => setSelection({ type: "condition", id: c.id })}
                    >
                      <span
                        className="swatch sm"
                        style={{ background: loe?.color ?? "#999" }}
                      />
                      <span className="row-label">{c.label}</span>
                    </button>
                  </li>
                );
              })}
          </ol>
        )}
      </section>

      <p className="hint">Click a row to edit it in the inspector.</p>
    </aside>
  );
}
