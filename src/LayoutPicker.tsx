import { TEMPLATES } from "./templates";
import type { OperationalDesign } from "./types";

export function LayoutPicker({
  onChoose,
  onCancel,
}: {
  onChoose: (design: OperationalDesign) => void;
  onCancel: () => void;
}) {
  return (
    <div className="modal-backdrop" onClick={onCancel} role="presentation">
      <div
        className="modal wide"
        role="dialog"
        aria-labelledby="layout-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="layout-title">Start from a sample</h2>
        <p>
          An empty picture, or a filled-in example. Your current picture is kept
          — Undo, or File → Restore previous.
        </p>
        <div className="template-grid">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={t.id === "blank" ? "template-card featured" : "template-card"}
              onClick={() => onChoose(t.create())}
            >
              <span className="template-kind">{t.tag}</span>
              <strong>{t.name}</strong>
              <span>{t.blurb}</span>
            </button>
          ))}
        </div>
        <button type="button" className="modal-close" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
