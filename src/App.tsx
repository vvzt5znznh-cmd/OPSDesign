import { useEffect, useRef, useState } from "react";
import { DetailFigure } from "./DetailFigure";
import { Diagram } from "./Diagram";
import { HelpModal } from "./Help";
import { Inspector } from "./Inspector";
import { LayoutPicker } from "./LayoutPicker";
import { DesignProvider, useDesign } from "./state";
import { saveDesign } from "./storage";
import { Toolbar } from "./Toolbar";
import type { OperationalDesign } from "./types";

function Editor() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [help, setHelp] = useState(false);
  const { present, undo, redo, linkMode, setLinkMode, selection, design } =
    useDesign();

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

  return (
    <div className={present ? "app present" : "app"}>
      <Toolbar svgRef={svgRef} onHelp={() => setHelp(true)} />
      <div className="workspace">
        <main className={selection && !present ? "canvas with-panel" : "canvas"}>
          {linkMode && (
            <div className="link-banner">
              Click what must happen first, then what depends on it.
              <button type="button" onClick={() => setLinkMode(false)}>
                Done
              </button>
            </div>
          )}
          <div className="canvas-scroll">
            <div className="figures">
              <Diagram svgRef={svgRef} />
              {design.showDetail && <DetailFigure />}
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
