import { useEffect, useRef, useState } from "react";
import { DetailFigure, DetailFigureToggle } from "./DetailFigure";
import { Diagram } from "./Diagram";
import { HelpModal } from "./Help";
import { Inspector } from "./Inspector";
import { LayoutPicker } from "./LayoutPicker";
import { PhasePage, usePhaseViewState } from "./PhaseFigure";
import { useLang } from "./i18n";
import { DesignProvider, useDesign } from "./state";
import { saveDesign } from "./storage";
import { Toolbar } from "./Toolbar";
import type { OperationalDesign } from "./types";

function Editor() {
  const svgRef = useRef<SVGSVGElement>(null);
  const phaseSvgRef = useRef<SVGSVGElement>(null);
  const [help, setHelp] = useState(false);
  const { present, undo, redo, linkMode, setLinkMode, selection, design } =
    useDesign();
  const { t } = useLang();
  const phaseView = usePhaseViewState(design.id, design.phases.length);
  const onPhase = phaseView.view === "phase";
  const pictureRef = onPhase ? phaseSvgRef : svgRef;
  const phaseName = onPhase
    ? (design.phases[phaseView.phaseIndex] ?? design.phases[0])?.name
    : undefined;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)
      ) {
        return;
      }
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  function openPhaseView() {
    setLinkMode(false);
    if (selection?.type === "phase") {
      const i = design.phases.findIndex((p) => p.id === selection.id);
      phaseView.openPhase(i >= 0 ? i : undefined);
      return;
    }
    phaseView.openPhase();
  }

  return (
    <div className={present ? "app present" : "app"}>
      <Toolbar
        svgRef={pictureRef}
        view={phaseView.view}
        onView={(next) => {
          if (next === "phase") openPhaseView();
          else phaseView.setView("picture");
        }}
        phaseName={phaseName}
        onHelp={() => setHelp(true)}
      />
      <div className="workspace">
        <main className={selection && !present ? "canvas with-panel" : "canvas"}>
          {linkMode && !onPhase && (
            <div className="link-banner">
              {t.linkBanner}
              <button type="button" onClick={() => setLinkMode(false)}>
                {t.done}
              </button>
            </div>
          )}
          <div className="canvas-scroll">
            <div className="figures">
              {onPhase ? (
                <PhasePage
                  svgRef={phaseSvgRef}
                  phaseIndex={phaseView.phaseIndex}
                  onPhaseIndex={phaseView.setPhaseIndex}
                  visibleLoeIds={phaseView.visibleLoeIds}
                  onVisibleLoeIds={phaseView.setVisibleLoeIds}
                  showLoeEnds={phaseView.showLoeEnds}
                  onShowLoeEnds={phaseView.setShowLoeEnds}
                  showCampaignEnd={phaseView.showCampaignEnd}
                  onShowCampaignEnd={phaseView.setShowCampaignEnd}
                  showHeading={phaseView.showHeading}
                  onShowHeading={phaseView.setShowHeading}
                  showLoeText={phaseView.showLoeText}
                  onShowLoeText={phaseView.setShowLoeText}
                  showGates={phaseView.showGates}
                  onShowGates={phaseView.setShowGates}
                />
              ) : (
                <>
                  <Diagram svgRef={svgRef} />
                  <DetailFigureToggle />
                  {design.showDetail && <DetailFigure />}
                </>
              )}
            </div>
          </div>
        </main>
        {selection && !present && <Inspector />}
      </div>
      {help && <HelpModal onClose={() => setHelp(false)} />}
    </div>
  );
}

export default function App({
  initial,
}: {
  initial: OperationalDesign | null;
}) {
  const [design, setDesign] = useState<OperationalDesign | null>(initial);

  function choose(next: OperationalDesign) {
    saveDesign(next);
    setDesign(next);
  }

  if (!design) {
    return <LayoutPicker onChoose={choose} />;
  }

  return (
    <DesignProvider key={design.id} initial={design}>
      <Editor />
    </DesignProvider>
  );
}
