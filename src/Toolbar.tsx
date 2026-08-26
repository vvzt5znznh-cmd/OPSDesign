import { useEffect, useRef, useState, type RefObject } from "react";
import { downloadPng, downloadSvg } from "./export";
import { downloadPages } from "./exportPages";
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
import { useLang } from "./i18n";
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
  const { lang, setLang, t } = useLang();
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
    await downloadPng(svgRef.current, design, diagram, 2);
  }

  function exportSvg() {
    if (!svgRef.current) return;
    downloadSvg(svgRef.current, design, diagram);
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
        window.alert(err instanceof Error ? err.message : t.importFailed);
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
          aria-label={t.projectTitle}
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
            {linkMode ? t.linking : t.link}
          </button>
          <button type="button" className="tool" onClick={undo} disabled={!canUndo}>
            {t.undo}
          </button>
          <button type="button" className="tool" onClick={redo} disabled={!canRedo}>
            {t.redo}
          </button>
        </div>
        <div className="tool-group hide-present">
          <Menu label={t.file}>
            <button type="button" role="menuitem" onClick={() => setLayoutOpen(true)}>
              {t.newFile}
            </button>
            {hasPrevious && (
              <button type="button" role="menuitem" onClick={restorePrevious}>
                {t.restorePrevious}
              </button>
            )}
            <button type="button" role="menuitem" onClick={() => fileRef.current?.click()}>
              {t.openJson}
            </button>
            <button type="button" role="menuitem" onClick={() => setLlmOpen(true)}>
              {t.askLlm}
            </button>
            <button type="button" role="menuitem" onClick={() => downloadJson(design)}>
              {t.saveJson}
            </button>
            <button type="button" role="menuitem" onClick={() => void exportPng()}>
              {t.exportPng}
            </button>
            <button type="button" role="menuitem" onClick={exportSvg}>
              {t.exportSvg}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                if (!svgRef.current) return;
                void downloadPages(svgRef.current, design, diagram).catch((err) => {
                  window.alert(
                    err instanceof Error
                      ? err.message
                      : t.pagesFailed,
                  );
                });
              }}
            >
              {t.exportPages}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                void downloadPptx(design, diagram).catch((err) => {
                  window.alert(
                    err instanceof Error
                      ? err.message
                      : t.pptxFailed,
                  );
                });
              }}
            >
              {t.exportPptx}
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
          <button type="button" className="tool" onClick={onHelp} title={t.help}>
            ?
          </button>
        </div>
        <div className="tool-group">
          <div className="kind-toggle lang-toggle keep-present" role="group" aria-label={t.langTitle}>
            <button
              type="button"
              className={lang === "en" ? "on" : ""}
              onClick={() => setLang("en")}
            >
              {t.langEn}
            </button>
            <button
              type="button"
              className={lang === "nb" ? "on" : ""}
              onClick={() => setLang("nb")}
            >
              {t.langNb}
            </button>
          </div>
          <button
            type="button"
            className={theme === "dark" ? "tool keep-present on" : "tool keep-present"}
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-pressed={theme === "dark"}
          >
            {t.dark}
          </button>
          <button
            type="button"
            className="tool keep-present"
            onClick={() => setPresent(!present)}
          >
            {present ? t.edit : t.present}
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
