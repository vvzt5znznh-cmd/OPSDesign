import { useEffect, useRef, useState, type RefObject } from "react";
import { downloadPng, downloadSvg } from "./export";
import { Menu } from "./Menu";
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
  } = useDesign();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(design.title);

  useEffect(() => {
    setTitle(design.title);
  }, [design.title]);

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
      <div className="toolbar-left hide-present">
        <div className="brand">
          <span className="logo" aria-hidden />
          <span>OPSDesign</span>
        </div>
        <input
          className="title-input"
          value={title}
          aria-label="Project title"
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            if (title.trim() && title !== design.title) {
              dispatch({ type: "setTitle", title: title.trim() });
            } else {
              setTitle(design.title);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
      </div>

      <div className="toolbar-right">
        <div className="tool-group hide-present">
          <button
            type="button"
            className={linkMode ? "tool primary on" : "tool primary"}
            onClick={() => setLinkMode(!linkMode)}
          >
            {linkMode ? "Linking…" : "Link"}
          </button>
          <button type="button" className="tool" onClick={undo} disabled={!canUndo}>
            Undo
          </button>
          <button type="button" className="tool" onClick={redo} disabled={!canRedo}>
            Redo
          </button>
        </div>
        <div className="tool-group hide-present">
          <Menu label="File">
            <button type="button" role="menuitem" onClick={onNew}>
              New
            </button>
            <button type="button" role="menuitem" onClick={() => fileRef.current?.click()}>
              Open JSON…
            </button>
            <button type="button" role="menuitem" onClick={() => downloadJson(design)}>
              Save JSON
            </button>
            <button type="button" role="menuitem" onClick={() => void exportPng()}>
              Export PNG
            </button>
            <button type="button" role="menuitem" onClick={exportSvg}>
              Export SVG
            </button>
          </Menu>
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
          <button type="button" className="tool" onClick={onHelp} title="Help">
            ?
          </button>
        </div>
        <div className="tool-group">
          <button
            type="button"
            className="tool keep-present"
            onClick={() => setPresent(!present)}
          >
            {present ? "Edit" : "Present"}
          </button>
        </div>
      </div>
    </header>
  );
}
