import { useRef, type RefObject } from "react";
import { downloadPng, downloadSvg } from "./export";
import { downloadJson, parseImportedDesign } from "./storage";
import { useDesign } from "./state";

export function Toolbar({
  svgRef,
  onNew,
  onHelp,
}: {
  svgRef: RefObject<SVGSVGElement | null>;
  onNew: () => void;
  onHelp: () => void;
}) {
  const {
    design,
    dispatch,
    undo,
    redo,
    canUndo,
    canRedo,
    present,
    setPresent,
    linkMode,
    setLinkMode,
    showDependencies,
    setShowDependencies,
  } = useDesign();
  const fileRef = useRef<HTMLInputElement>(null);

  async function exportPng() {
    if (!svgRef.current) return;
    await downloadPng(svgRef.current, design.title);
  }

  function exportSvg() {
    if (!svgRef.current) return;
    downloadSvg(svgRef.current, design.title);
  }

  function onImport(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const next = parseImportedDesign(String(reader.result));
        dispatch({ type: "replace", design: next });
      } catch (err) {
        window.alert(err instanceof Error ? err.message : "Import failed.");
      }
    };
    reader.readAsText(file);
  }

  return (
    <header className="toolbar">
      <div className="brand">
        <span className="logo" aria-hidden />
        <span>OPSDesign</span>
      </div>

      <div className="kind-toggle" role="group" aria-label="Diagram tools">
        <button
          type="button"
          className={linkMode ? "on" : ""}
          onClick={() => setLinkMode(!linkMode)}
        >
          Link dependencies
        </button>
        <button
          type="button"
          className={showDependencies ? "on" : ""}
          onClick={() => setShowDependencies(!showDependencies)}
        >
          Show links
        </button>
      </div>

      <div className="toolbar-actions">
        <button type="button" onClick={undo} disabled={!canUndo} title="Undo">
          Undo
        </button>
        <button type="button" onClick={redo} disabled={!canRedo} title="Redo">
          Redo
        </button>
        <button
          type="button"
          className="keep-present"
          onClick={() => setPresent(!present)}
        >
          {present ? "Edit" : "Present"}
        </button>
        <button type="button" onClick={exportPng}>
          PNG
        </button>
        <button type="button" onClick={exportSvg}>
          SVG
        </button>
        <button type="button" onClick={() => downloadJson(design)}>
          Save JSON
        </button>
        <button type="button" onClick={() => fileRef.current?.click()}>
          Open JSON
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            onImport(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <button type="button" onClick={onHelp}>
          Help
        </button>
        <button type="button" className="ghost" onClick={onNew}>
          New
        </button>
      </div>
      <p className="toolbar-note">
        {linkMode
          ? "Click a node, then the node that depends on it. Escape cancels."
          : "Milestones are events. Conditions are states that must hold. Dashed arrows are dependencies. Gates are decisions."}
      </p>
    </header>
  );
}
