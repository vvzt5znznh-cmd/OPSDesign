import { useEffect, useRef, useState } from "react";
import { Diagram } from "./Diagram";
import { HelpModal } from "./Help";
import { Inspector } from "./Inspector";
import { Sidebar } from "./Sidebar";
import { DesignProvider, useDesign } from "./state";
import { saveDesign } from "./storage";
import { Toolbar } from "./Toolbar";
import { Welcome } from "./Welcome";
import type { OperationalDesign } from "./types";

function Editor({
  onNew,
}: {
  onNew: () => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [help, setHelp] = useState(false);
  const { present, undo, redo } = useDesign();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) {
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
      <Toolbar svgRef={svgRef} onNew={onNew} onHelp={() => setHelp(true)} />
      <div className="workspace">
        <Sidebar />
        <main className="canvas">
          <div className="canvas-scroll">
            <Diagram svgRef={svgRef} />
          </div>
        </main>
        <Inspector />
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
  const [picking, setPicking] = useState(!initial);

  function choose(next: OperationalDesign) {
    saveDesign(next);
    setDesign(next);
    setPicking(false);
  }

  if (!design) {
    return <Welcome onChoose={choose} />;
  }

  return (
    <DesignProvider key={design.id} initial={design}>
      <Editor onNew={() => setPicking(true)} />
      {picking && (
        <Welcome onChoose={choose} onCancel={() => setPicking(false)} />
      )}
    </DesignProvider>
  );
}
