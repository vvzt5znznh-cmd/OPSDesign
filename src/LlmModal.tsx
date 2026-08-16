import { useState } from "react";
import { llmPromptWithSample, sampleDesignJson } from "./llm";
import { triggerDownload } from "./storage";

export function LlmModal({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const text = llmPromptWithSample();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      window.prompt("Copy this prompt:", text);
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
        <h2 id="llm-title">Ask an LLM for a picture</h2>
        <p>
          Give a language model the prompt and the sample file, then describe
          your project in plain language. Save the JSON it returns and open it
          here with File → Open JSON.
        </p>
        <ol className="llm-steps">
          <li>Copy the prompt (it includes the sample).</li>
          <li>
            Paste it into ChatGPT, Claude, or similar. Attach the sample file
            if the model takes files.
          </li>
          <li>Describe the work: outcome, stages, concurrent streams, decisions.</li>
          <li>Save the reply as a <code>.json</code> file. File → Open JSON.</li>
        </ol>
        <div className="llm-actions">
          <button type="button" onClick={() => void copy()}>
            {copied ? "Copied" : "Copy prompt"}
          </button>
          <button type="button" onClick={downloadSample}>
            Download sample JSON
          </button>
        </div>
        <pre className="llm-preview" tabIndex={0}>
          {llmPromptWithSample()}
        </pre>
        <button type="button" className="modal-close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
