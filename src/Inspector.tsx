import type { ReactNode } from "react";
import { nodeKindLabel } from "./design";
import { uid } from "./id";
import { useLang } from "./i18n";
import { useDesign } from "./state";
import { LOE_COLORS, END_STATE_COLORS } from "./types";

function commit(previous: string, next: string, apply: () => void) {
  if (next === previous) return;
  apply();
}

function Head({ children }: { children: ReactNode }) {
  const { setSelection } = useDesign();
  return (
    <div className="inspector-head">
      <h2>{children}</h2>
      <button
        type="button"
        className="inspector-close"
        onClick={() => setSelection(null)}
        aria-label={useLang().t.close}
      >
        ×
      </button>
    </div>
  );
}

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

function LoeEndStatesToggle() {
  const { design, dispatch } = useDesign();
  const { t } = useLang();
  const on = design.showLoeEndStates;
  return (
    <>
      <p className="field-label">{t.workstreamEndStates}</p>
      <div
        className="kind-toggle inspector-toggle"
        role="group"
        aria-label={t.workstreamEndStates}
      >
        <button
          type="button"
          className={!on ? "on" : ""}
          onClick={() => dispatch({ type: "setShowLoeEndStates", value: false })}
        >
          {t.off}
        </button>
        <button
          type="button"
          className={on ? "on" : ""}
          onClick={() => dispatch({ type: "setShowLoeEndStates", value: true })}
        >
          {t.on}
        </button>
      </div>
      <p className="muted">{on ? t.loeEndsOn : t.loeEndsOff}</p>
    </>
  );
}

export function Inspector() {
  const { design, selection, dispatch, setSelection, setLinkMode, setLinkFrom } =
    useDesign();
  const { t } = useLang();

  if (!selection) return null;

  if (selection.type === "title") {
    return (
      <aside className="inspector">
        <Head>{t.project}</Head>
        <Field label={t.title}>
          <input
            key={design.id}
            defaultValue={design.title}
            onBlur={(e) =>
              commit(design.title, e.target.value, () =>
                dispatch({ type: "setTitle", title: e.target.value }),
              )
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
          />
        </Field>
        <Field label={t.purpose}>
          <textarea
            key={`${design.id}-purpose`}
            rows={3}
            defaultValue={design.purpose}
            placeholder={t.purposePlaceholder}
            onBlur={(e) =>
              commit(design.purpose, e.target.value, () =>
                dispatch({ type: "setPurpose", purpose: e.target.value }),
              )
            }
          />
        </Field>
      </aside>
    );
  }

  if (selection.type === "endState") {
    return (
      <aside className="inspector">
        <Head>{t.endState}</Head>
        <p className="muted">{t.endStateIntro}</p>
        <Field label={t.name}>
          <input
            key="es-name"
            defaultValue={design.endState.name}
            onBlur={(e) =>
              commit(design.endState.name, e.target.value, () =>
                dispatch({ type: "setEndState", name: e.target.value }),
              )
            }
          />
        </Field>
        <Field label={t.whatWillBeTrue}>
          <textarea
            key="es-desc"
            rows={5}
            defaultValue={design.endState.description}
            onBlur={(e) =>
              commit(design.endState.description, e.target.value, () =>
                dispatch({
                  type: "setEndState",
                  description: e.target.value,
                }),
              )
            }
            placeholder={t.whatWillBeTrueHint}
          />
        </Field>
        <LoeEndStatesToggle />
        <Field label={t.colour}>
          <div className="palette">
            {END_STATE_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={
                  color === design.endState.color ? "swatch-btn on" : "swatch-btn"
                }
                style={{ background: color }}
                aria-label={color}
                onClick={() => dispatch({ type: "setEndState", color })}
              />
            ))}
          </div>
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
        <Head>{t.phase}</Head>
        <Field label={t.name}>
          <input
            key={phase.id}
            defaultValue={phase.name}
            onBlur={(e) =>
              commit(phase.name, e.target.value, () =>
                dispatch({
                  type: "renamePhase",
                  id: phase.id,
                  name: e.target.value,
                }),
              )
            }
          />
        </Field>
        <div className="btn-row">
          <button
            type="button"
            disabled={idx === 0}
            onClick={() => dispatch({ type: "movePhase", id: phase.id, direction: -1 })}
          >
            {t.earlier}
          </button>
          <button
            type="button"
            disabled={idx === design.phases.length - 1}
            onClick={() => dispatch({ type: "movePhase", id: phase.id, direction: 1 })}
          >
            {t.later}
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            const id = uid("ph");
            dispatch({ type: "addPhase", afterId: phase.id, id });
            setSelection({ type: "phase", id });
          }}
        >
          {t.addPhaseAfter}
        </button>
        <button
          type="button"
          className="danger"
          disabled={design.phases.length <= 1}
          onClick={() => dispatch({ type: "removePhase", id: phase.id })}
        >
          {t.removePhase}
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
        <Head>{t.workstream}</Head>
        <p className="muted">{t.workstreamIntro}</p>
        <Field label={t.name}>
          <input
            key={loe.id}
            defaultValue={loe.name}
            onBlur={(e) =>
              commit(loe.name, e.target.value, () =>
                dispatch({
                  type: "updateLoe",
                  id: loe.id,
                  name: e.target.value,
                }),
              )
            }
          />
        </Field>
        <Field label={t.purpose}>
          <input
            key={`${loe.id}-purpose`}
            defaultValue={loe.purpose}
            placeholder={t.streamPurposePlaceholder}
            onBlur={(e) =>
              commit(loe.purpose, e.target.value, () =>
                dispatch({
                  type: "updateLoe",
                  id: loe.id,
                  purpose: e.target.value,
                }),
              )
            }
          />
        </Field>
        <LoeEndStatesToggle />
        {design.showLoeEndStates && (
          <>
            <Field label={t.endState}>
              <textarea
                key={`${loe.id}-end-state`}
                rows={3}
                defaultValue={loe.endState}
                onBlur={(e) =>
                  commit(loe.endState, e.target.value, () =>
                    dispatch({
                      type: "updateLoe",
                      id: loe.id,
                      endState: e.target.value,
                    }),
                  )
                }
                placeholder={t.streamEndPlaceholder}
              />
            </Field>
            <p className="muted">{t.streamFeedsCampaign}</p>
          </>
        )}
        <Field label={t.colour}>
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
            {t.up}
          </button>
          <button
            type="button"
            disabled={idx === design.linesOfEffort.length - 1}
            onClick={() => dispatch({ type: "moveLoe", id: loe.id, direction: 1 })}
          >
            {t.down}
          </button>
        </div>
        <button
          type="button"
          className="danger"
          disabled={design.linesOfEffort.length <= 1}
          onClick={() => dispatch({ type: "removeLoe", id: loe.id })}
        >
          {t.removeWorkstream}
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
        <Head>{nodeKindLabel(n.kind)}</Head>
        <div className="kind-toggle inspector-toggle">
          <button
            type="button"
            className={n.kind === "milestone" ? "on" : ""}
            onClick={() =>
              dispatch({ type: "updateNode", id: n.id, kind: "milestone" })
            }
          >
            {t.milestone}
          </button>
          <button
            type="button"
            className={n.kind === "condition" ? "on" : ""}
            onClick={() =>
              dispatch({ type: "updateNode", id: n.id, kind: "condition" })
            }
          >
            {t.condition}
          </button>
        </div>
        <p className="muted">
          {n.kind === "milestone" ? t.milestoneIntro : t.conditionIntro}
        </p>
        <Field label={t.label}>
          <input
            key={n.id}
            defaultValue={n.label}
            onBlur={(e) =>
              commit(n.label, e.target.value, () =>
                dispatch({ type: "updateNode", id: n.id, label: e.target.value }),
              )
            }
          />
        </Field>
        {design.showDetail && (
          <Field label={t.description}>
            <textarea
              key={`${n.id}-desc`}
              rows={3}
              defaultValue={n.description}
              placeholder={t.nodeDescPlaceholder}
              onBlur={(e) =>
                commit(n.description, e.target.value, () =>
                  dispatch({
                    type: "updateNode",
                    id: n.id,
                    description: e.target.value,
                  }),
                )
              }
            />
          </Field>
        )}
        <Field label={t.workstream}>
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
        <Field label={t.phase}>
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
        <Field label={t.dependsOn}>
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
            <option value="">{t.addPredecessor}</option>
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
                  <span>{from?.label ?? t.unknown}</span>
                  <button
                    type="button"
                    className="tiny"
                    onClick={() => dispatch({ type: "removeDependency", id: d.id })}
                  >
                    {t.remove}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {outgoing.length > 0 && (
          <>
            <p className="field-label">{t.thisEnables}</p>
            <ul className="dep-list">
              {outgoing.map((d) => {
                const to = design.nodes.find((x) => x.id === d.toId);
                return (
                  <li key={d.id}>
                    <span>{to?.label ?? t.unknown}</span>
                    <button
                      type="button"
                      className="tiny"
                      onClick={() =>
                        dispatch({ type: "removeDependency", id: d.id })
                      }
                    >
                      {t.remove}
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
          {t.drawLink}
        </button>
        <button
          type="button"
          className="danger"
          onClick={() => dispatch({ type: "removeNode", id: n.id })}
        >
          {t.remove}
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
        <Head>{t.dependency}</Head>
        <p className="muted">
          {t.dependencyIntro(from?.label ?? t.unknown, to?.label ?? t.unknown)}
        </p>
        <button
          type="button"
          className="danger"
          onClick={() => dispatch({ type: "removeDependency", id: dep.id })}
        >
          {t.removeLink}
        </button>
      </aside>
    );
  }

  if (selection.type === "dp") {
    const dp = design.decisionPoints.find((d) => d.id === selection.id);
    if (!dp) return null;
    return (
      <aside className="inspector">
        <Head>{t.gate}</Head>
        <p className="muted">{t.gateIntro}</p>
        <Field label={t.label}>
          <input
            key={dp.id}
            defaultValue={dp.label}
            placeholder={t.gateLabelPlaceholder}
            onBlur={(e) =>
              commit(dp.label, e.target.value, () =>
                dispatch({ type: "updateDp", id: dp.id, label: e.target.value }),
              )
            }
          />
        </Field>
        {design.showDetail && (
          <Field label={t.description}>
            <textarea
              key={`${dp.id}-desc`}
              rows={3}
              defaultValue={dp.description}
              placeholder={t.gateDescPlaceholder}
              onBlur={(e) =>
                commit(dp.description, e.target.value, () =>
                  dispatch({
                    type: "updateDp",
                    id: dp.id,
                    description: e.target.value,
                  }),
                )
              }
            />
          </Field>
        )}
        <Field label={t.phase}>
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
        <div className="kind-toggle inspector-toggle">
          <button
            type="button"
            className={dp.placement === "in" ? "on" : ""}
            onClick={() =>
              dispatch({ type: "updateDp", id: dp.id, placement: "in" })
            }
          >
            {t.inPhase}
          </button>
          <button
            type="button"
            className={dp.placement !== "in" ? "on" : ""}
            onClick={() =>
              dispatch({ type: "updateDp", id: dp.id, placement: "after" })
            }
          >
            {t.afterPhase}
          </button>
        </div>
        <button
          type="button"
          className="danger"
          onClick={() => dispatch({ type: "removeDp", id: dp.id })}
        >
          {t.remove}
        </button>
      </aside>
    );
  }

  return null;
}
