import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Diagram } from "./Diagram";
import { phaseViewDesign } from "./design";
import { useLang } from "./i18n";
import { useDesign } from "./state";

export type EditorView = "picture" | "phase";

export function PhasePage({
  svgRef,
  phaseIndex,
  onPhaseIndex,
  visibleLoeIds,
  onVisibleLoeIds,
  showLoeEnds,
  onShowLoeEnds,
  showCampaignEnd,
  onShowCampaignEnd,
  showHeading,
  onShowHeading,
  showLoeText,
  onShowLoeText,
  showGates,
  onShowGates,
}: {
  svgRef: RefObject<SVGSVGElement | null>;
  phaseIndex: number;
  onPhaseIndex: (i: number) => void;
  visibleLoeIds: string[];
  onVisibleLoeIds: (ids: string[]) => void;
  showLoeEnds: boolean;
  onShowLoeEnds: (on: boolean) => void;
  showCampaignEnd: boolean;
  onShowCampaignEnd: (on: boolean) => void;
  showHeading: boolean;
  onShowHeading: (on: boolean) => void;
  showLoeText: boolean;
  onShowLoeText: (on: boolean) => void;
  showGates: boolean;
  onShowGates: (on: boolean) => void;
}) {
  const { design } = useDesign();
  const { t } = useLang();
  const phase = design.phases[phaseIndex] ?? design.phases[0];
  const layoutOptions = useMemo(
    () => ({ showCampaignEnd, showHeading, showLoeText, showGates }),
    [showCampaignEnd, showHeading, showLoeText, showGates],
  );
  const picture = useMemo(
    () =>
      phase
        ? phaseViewDesign(design, phase.id, {
            visibleLoeIds,
            showLoeEndStates: showLoeEnds,
          })
        : null,
    [design, phase, visibleLoeIds, showLoeEnds],
  );

  if (!phase || !picture) return null;

  function toggleLoe(id: string) {
    if (visibleLoeIds.includes(id)) {
      if (visibleLoeIds.length === 1) return;
      onVisibleLoeIds(visibleLoeIds.filter((x) => x !== id));
    } else {
      onVisibleLoeIds(
        design.linesOfEffort.map((l) => l.id).filter((x) => x === id || visibleLoeIds.includes(x)),
      );
    }
  }

  return (
    <section className="phase-page" aria-label={t.phaseView}>
      <div className="phase-figure-chrome hide-present">
        <div className="phase-stepper">
          <button
            type="button"
            className="tool"
            disabled={phaseIndex <= 0}
            aria-label={t.prevPhase}
            onClick={() => onPhaseIndex(Math.max(0, phaseIndex - 1))}
          >
            ←
          </button>
          <strong>{phase.name}</strong>
          <button
            type="button"
            className="tool"
            disabled={phaseIndex >= design.phases.length - 1}
            aria-label={t.nextPhase}
            onClick={() =>
              onPhaseIndex(Math.min(design.phases.length - 1, phaseIndex + 1))
            }
          >
            →
          </button>
        </div>
        <label className="phase-switch">
          <input
            type="checkbox"
            checked={showHeading}
            onChange={(e) => onShowHeading(e.target.checked)}
          />
          {t.pictureHeading}
        </label>
        <label className="phase-switch">
          <input
            type="checkbox"
            checked={showGates}
            onChange={(e) => onShowGates(e.target.checked)}
          />
          {t.gates}
        </label>
        <label className="phase-switch">
          <input
            type="checkbox"
            checked={showCampaignEnd}
            onChange={(e) => onShowCampaignEnd(e.target.checked)}
          />
          {t.campaignEndPanel}
        </label>
      </div>
      <div className="phase-stage">
        <aside className="phase-loe-rail hide-present" aria-label={t.workstreams}>
          <label className="phase-switch">
            <input
              type="checkbox"
              checked={showLoeText}
              onChange={(e) => onShowLoeText(e.target.checked)}
            />
            {t.loeLabels}
          </label>
          <label className="phase-switch">
            <input
              type="checkbox"
              checked={showLoeEnds}
              onChange={(e) => onShowLoeEnds(e.target.checked)}
            />
            {t.workstreamEndStates}
          </label>
          <div className="phase-loe-list" role="group" aria-label={t.workstreams}>
            {design.linesOfEffort.map((loe) => {
              const on = visibleLoeIds.includes(loe.id);
              return (
                <button
                  key={loe.id}
                  type="button"
                  className={on ? "phase-loe-btn on" : "phase-loe-btn"}
                  style={{ ["--chip" as string]: loe.color }}
                  onClick={() => toggleLoe(loe.id)}
                  aria-pressed={on}
                >
                  <span className="phase-loe-swatch" aria-hidden />
                  {loe.name}
                </button>
              );
            })}
          </div>
        </aside>
        <Diagram
          svgRef={svgRef}
          picture={picture}
          readOnly
          layoutOptions={layoutOptions}
        />
      </div>
    </section>
  );
}

export function usePhaseViewState(designId: string, phaseCount: number) {
  const { design } = useDesign();
  const [view, setView] = useState<EditorView>("picture");
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [visibleLoeIds, setVisibleLoeIds] = useState<string[]>(() =>
    design.linesOfEffort.map((l) => l.id),
  );
  const [showLoeEnds, setShowLoeEnds] = useState(design.showLoeEndStates);
  const [showCampaignEnd, setShowCampaignEnd] = useState(true);
  const [showHeading, setShowHeading] = useState(true);
  const [showLoeText, setShowLoeText] = useState(true);
  const [showGates, setShowGates] = useState(true);
  const prevDesign = useRef(designId);
  const prevLoeIds = useRef(design.linesOfEffort.map((l) => l.id).join(","));

  useEffect(() => {
    if (prevDesign.current !== designId) {
      prevDesign.current = designId;
      setView("picture");
      setPhaseIndex(0);
      setVisibleLoeIds(design.linesOfEffort.map((l) => l.id));
      setShowLoeEnds(design.showLoeEndStates);
      setShowCampaignEnd(true);
      setShowHeading(true);
      setShowLoeText(true);
      setShowGates(true);
      prevLoeIds.current = design.linesOfEffort.map((l) => l.id).join(",");
    }
  }, [design, designId]);

  useEffect(() => {
    if (phaseIndex >= phaseCount) setPhaseIndex(Math.max(0, phaseCount - 1));
  }, [phaseCount, phaseIndex]);

  useEffect(() => {
    const ids = design.linesOfEffort.map((l) => l.id);
    const key = ids.join(",");
    if (key === prevLoeIds.current) return;
    const prev = prevLoeIds.current.split(",").filter(Boolean);
    prevLoeIds.current = key;
    const newcomers = ids.filter((id) => !prev.includes(id));
    setVisibleLoeIds((current) => {
      const kept = current.filter((id) => ids.includes(id));
      const next = [...kept, ...newcomers.filter((id) => !kept.includes(id))];
      return next.length ? next : ids;
    });
  }, [design.linesOfEffort]);

  function openPhase(index?: number) {
    if (index !== undefined && index >= 0 && index < phaseCount) {
      setPhaseIndex(index);
    }
    setView("phase");
  }

  return {
    view,
    setView,
    openPhase,
    phaseIndex,
    setPhaseIndex,
    visibleLoeIds,
    setVisibleLoeIds,
    showLoeEnds,
    setShowLoeEnds,
    showCampaignEnd,
    setShowCampaignEnd,
    showHeading,
    setShowHeading,
    showLoeText,
    setShowLoeText,
    showGates,
    setShowGates,
  };
}
