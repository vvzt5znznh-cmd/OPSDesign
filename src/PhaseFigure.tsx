import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Diagram } from "./Diagram";
import { defaultVisibleLoeIds, phaseViewDesign } from "./design";
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
}) {
  const { design } = useDesign();
  const { t } = useLang();
  const phase = design.phases[phaseIndex] ?? design.phases[0];
  const layoutOptions = useMemo(
    () => ({ showCampaignEnd, showHeading, showLoeText }),
    [showCampaignEnd, showHeading, showLoeText],
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
        <div className="phase-chips" role="group" aria-label={t.workstreams}>
          {design.linesOfEffort.map((loe) => {
            const on = visibleLoeIds.includes(loe.id);
            return (
              <button
                key={loe.id}
                type="button"
                className={on ? "phase-chip on" : "phase-chip"}
                style={{ ["--chip" as string]: loe.color }}
                onClick={() => toggleLoe(loe.id)}
              >
                {loe.name}
              </button>
            );
          })}
        </div>
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
            checked={showHeading}
            onChange={(e) => onShowHeading(e.target.checked)}
          />
          {t.pictureHeading}
        </label>
        <label className="phase-switch">
          <input
            type="checkbox"
            checked={showLoeEnds}
            onChange={(e) => onShowLoeEnds(e.target.checked)}
          />
          {t.workstreamEndStates}
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
      <Diagram
        svgRef={svgRef}
        picture={picture}
        readOnly
        layoutOptions={layoutOptions}
      />
    </section>
  );
}

export function usePhaseViewState(designId: string, phaseCount: number) {
  const { design } = useDesign();
  const [view, setView] = useState<EditorView>("picture");
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [visibleLoeIds, setVisibleLoeIds] = useState<string[]>(() =>
    design.phases[0]
      ? defaultVisibleLoeIds(design, design.phases[0].id)
      : design.linesOfEffort.map((l) => l.id),
  );
  const [showLoeEnds, setShowLoeEnds] = useState(design.showLoeEndStates);
  const [showCampaignEnd, setShowCampaignEnd] = useState(true);
  const [showHeading, setShowHeading] = useState(true);
  const [showLoeText, setShowLoeText] = useState(true);
  const prevDesign = useRef(designId);
  const prevPhase = useRef(phaseIndex);

  useEffect(() => {
    if (prevDesign.current !== designId) {
      prevDesign.current = designId;
      setView("picture");
      setPhaseIndex(0);
      const first = design.phases[0];
      setVisibleLoeIds(
        first
          ? defaultVisibleLoeIds(design, first.id)
          : design.linesOfEffort.map((l) => l.id),
      );
      setShowLoeEnds(design.showLoeEndStates);
      setShowCampaignEnd(true);
      setShowHeading(true);
      setShowLoeText(true);
    }
  }, [design, designId]);

  useEffect(() => {
    if (phaseIndex >= phaseCount) setPhaseIndex(Math.max(0, phaseCount - 1));
  }, [phaseCount, phaseIndex]);

  useEffect(() => {
    if (prevPhase.current === phaseIndex) return;
    prevPhase.current = phaseIndex;
    const phase = design.phases[phaseIndex];
    if (phase) setVisibleLoeIds(defaultVisibleLoeIds(design, phase.id));
  }, [design, phaseIndex]);

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
  };
}
