import { detailFigureModel, streamPhaseGroups } from "./design";
import { useDesign } from "./state";
import { CONDITION_FILL, MILESTONE_FILL } from "./types";

function MilestoneMark() {
  return (
    <svg className="detail-mark" viewBox="0 0 12 12" aria-hidden>
      <path d="M6 1.2 L11 10.5 H1 Z" fill={MILESTONE_FILL} />
    </svg>
  );
}

function ConditionMark() {
  return (
    <svg className="detail-mark" viewBox="0 0 12 12" aria-hidden>
      <path d="M6 1 L11 6 L6 11 L1 6 Z" fill={CONDITION_FILL} />
    </svg>
  );
}

function GateMark() {
  return (
    <svg className="detail-mark" viewBox="0 0 12 12" aria-hidden>
      <path
        d="M6 1.1 L7.4 4.4 L11 4.7 L8.3 7.1 L9.1 10.7 L6 8.8 L2.9 10.7 L3.7 7.1 L1 4.7 L4.6 4.4 Z"
        fill="#2E7D32"
      />
    </svg>
  );
}

export function DetailFigureToggle() {
  const { design, dispatch } = useDesign();
  const on = design.showDetail;
  return (
    <div className="detail-toggle hide-present">
      <span className="detail-toggle-label">Detail figure</span>
      <div className="kind-toggle" role="group" aria-label="Detail figure">
        <button
          type="button"
          className={!on ? "on" : ""}
          onClick={() => dispatch({ type: "setShowDetail", value: false })}
        >
          Off
        </button>
        <button
          type="button"
          className={on ? "on" : ""}
          onClick={() => dispatch({ type: "setShowDetail", value: true })}
        >
          On
        </button>
      </div>
    </div>
  );
}

export function DetailFigure() {
  const { design, selection, setSelection } = useDesign();
  const model = detailFigureModel(design);
  const empty =
    model.gates.length === 0 && model.streams.every((s) => s.nodes.length === 0);
  const cols = Math.max(1, model.streams.length);
  const colStyle = {
    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
  };
  const phaseNames = design.phases.map((p) => p.name);

  return (
    <section className="detail-figure" aria-label="Detail">
      <header className="detail-figure-head">
        <h2>Detail</h2>
        <p>
          Labels match the picture. Description is optional — it sits here, not
          on the figures.
        </p>
      </header>
      {empty ? (
        <p className="detail-empty">
          Add milestones, conditions, or gates on the picture. They will list
          here by workstream.
        </p>
      ) : (
        <>
          {model.gates.length > 0 && (
            <div className="detail-gates">
              <h3>Gates</h3>
              <ul className="detail-cols" style={colStyle}>
                {model.gates.map((g) => (
                  <li key={g.id}>
                    <button
                      type="button"
                      className={
                        selection?.type === "dp" && selection.id === g.id
                          ? "detail-item card on"
                          : "detail-item card"
                      }
                      onClick={() => setSelection({ type: "dp", id: g.id })}
                    >
                      <GateMark />
                      <span className="detail-item-body">
                        <span className="detail-item-label">{g.label}</span>
                        <span className="detail-item-meta">
                          {g.placement === "in" ? "In" : "After"} {g.phaseName}
                        </span>
                        {g.description.trim() ? (
                          <span className="detail-item-desc">
                            {g.description.trim()}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="detail-streams detail-cols" style={colStyle}>
            {model.streams.map((stream) => (
              <div key={stream.id} className="detail-stream">
                <span
                  className="detail-stream-rail"
                  style={{ background: stream.color }}
                />
                <h3 style={{ color: stream.color }}>{stream.name}</h3>
                {stream.purpose.trim() ? (
                  <p className="detail-stream-purpose">{stream.purpose}</p>
                ) : null}
                {stream.nodes.length === 0 ? (
                  <p className="detail-empty quiet">No milestones or conditions.</p>
                ) : (
                  streamPhaseGroups(stream.nodes, phaseNames).map((group) => (
                    <div key={group.name || stream.id} className="detail-phase-group">
                      {group.name ? (
                        <h4 className="detail-phase">{group.name}</h4>
                      ) : null}
                      <ul>
                        {group.nodes.map((n) => (
                          <li key={n.id}>
                            <button
                              type="button"
                              className={
                                selection?.type === "node" && selection.id === n.id
                                  ? "detail-item on"
                                  : "detail-item"
                              }
                              onClick={() =>
                                setSelection({ type: "node", id: n.id })
                              }
                            >
                              {n.kind === "milestone" ? (
                                <MilestoneMark />
                              ) : (
                                <ConditionMark />
                              )}
                              <span className="detail-item-body">
                                <span className="detail-item-label">{n.label}</span>
                                {n.description.trim() ? (
                                  <span className="detail-item-desc">
                                    {n.description.trim()}
                                  </span>
                                ) : null}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
