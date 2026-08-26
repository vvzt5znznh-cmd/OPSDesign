import { useState } from "react";
import { useLang } from "./i18n";
import { llmPromptWithSample, sampleDesignJson } from "./llm";
import { triggerDownload } from "./storage";

export function LlmModal({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const { t } = useLang();

  async function copyPrompt() {
    const text = llmPromptWithSample();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      window.prompt(t.copyPrompt, text);
    }
  }

  function downloadSample() {
    triggerDownload(
      new Blob([sampleDesignJson()], { type: "application/json" }),
      "opsdesign.sample.json",
    );
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal wide"
        role="dialog"
        aria-labelledby="llm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="llm-title">{t.llmTitle}</h2>
        <p>{t.llmIntro}</p>
        <ol className="llm-steps">
          <li>{t.llmStep1}</li>
          <li>{t.llmStep2}</li>
          <li>{t.llmStep3}</li>
          <li>
            {t.llmStep4}
          </li>
        </ol>
        <div className="llm-actions">
          <button type="button" onClick={() => void copyPrompt()}>
            {copied ? t.copied : t.copyPrompt}
          </button>
          <button type="button" onClick={downloadSample}>
            {t.downloadSample}
          </button>
        </div>
        <pre className="llm-preview" tabIndex={0}>
          {llmPromptWithSample()}
        </pre>
        <button type="button" className="modal-close" onClick={onClose}>
          {t.close}
        </button>
      </div>
    </div>
  );
}
