import { useEffect, useRef, useState, type RefObject } from "react";
import { downloadPng, downloadSvg } from "./export";
import { LayoutPicker } from "./LayoutPicker";
import { downloadPptx } from "./pptx";
import { Menu } from "./Menu";
import {
  downloadJson,
  loadPrevious,
  parseImportedDesign,
  stashPrevious,
} from "./storage";
import { LlmModal } from "./LlmModal";
import { useTheme } from "./theme";
import { useDesign } from "./state";
import type { OperationalDesign } from "./types";

export function Toolbar({
  svgRef,
  onHelp,
}: {
  svgRef: RefObject<SVGSVGElement | null>;
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
  const { theme, toggleTheme, diagram } = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(design.title);
  const [llmOpen, setLlmOpen] = useState(false);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(() => !!loadPrevious());

  useEffect(() => {
    setTitle(design.title);
  }, [design.title]);

  async function exportPng() {
    if (!svgRef.current) return;
    await downloadPng(svgRef.current, design.title, 2, diagram.bg);
  }

  function exportSvg() {
    if (!svgRef.current) return;
    downloadSvg(svgRef.current, design.title);
  }

  function replaceDesign(next: OperationalDesign) {
    stashPrevious(design);
    setHasPrevious(true);
    dispatch({ type: "replace", design: next });
  }

  function onImport(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        replaceDesign(parseImportedDesign(String(reader.result)));
      } catch (err) {
        window.alert(err instanceof Error ? err.message : "Import failed.");
      }
    };
    reader.readAsText(file);
  }

  function restorePrevious() {
    const previous = loadPrevious();
    if (!previous) return;
    stashPrevious(design);
    dispatch({ type: "replace", design: previous });
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
            <button type="button" role="menuitem" onClick={() => setLayoutOpen(true)}>
              New…
            </button>
            {hasPrevious && (
              <button type="button" role="menuitem" onClick={restorePrevious}>
                Restore previous
              </button>
            )}
            <button type="button" role="menuitem" onClick={() => fileRef.current?.click()}>
              Open JSON…
            </button>
            <button type="button" role="menuitem" onClick={() => setLlmOpen(true)}>
              Ask an LLM…
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
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                void downloadPptx(design, diagram).catch((err) => {
                  window.alert(
                    err instanceof Error
                      ? err.message
                      : "PowerPoint export failed.",
                  );
                });
              }}
            >
              Export PowerPoint…
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
            className={theme === "dark" ? "tool keep-present on" : "tool keep-present"}
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-pressed={theme === "dark"}
          >
            Dark
          </button>
          <button
            type="button"
            className="tool keep-present"
            onClick={() => setPresent(!present)}
          >
            {present ? "Edit" : "Present"}
          </button>
        </div>
      </div>
      {layoutOpen && (
        <LayoutPicker
          onChoose={(next) => {
            replaceDesign(next);
            setLayoutOpen(false);
          }}
          onCancel={() => setLayoutOpen(false)}
        />
      )}
      {llmOpen && <LlmModal onClose={() => setLlmOpen(false)} />}
    </header>
  );
}
