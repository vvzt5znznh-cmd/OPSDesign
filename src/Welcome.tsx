import { TEMPLATES } from "./templates";
import type { OperationalDesign } from "./types";

export function Welcome({
  onChoose,
  onCancel,
}: {
  onChoose: (design: OperationalDesign) => void;
  onCancel?: () => void;
}) {
  return (
    <div className={onCancel ? "welcome overlay" : "welcome"}>
      <div className="welcome-inner">
        <p className="eyebrow">Operational design</p>
        <h1>OPSDesign</h1>
        <p className="lede">
          Picture a project the way operational design does: workstreams running
          together, gates between stages, the outcome on the right. Milestones,
          conditions, and dependencies all sit on the same drawing. Built for
          civilian programmes as well as defence work.
        </p>
        <div className="template-grid">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              className="template-card"
              onClick={() => onChoose(t.create())}
            >
              <span className="template-kind">{t.tag}</span>
              <strong>{t.name}</strong>
              <span>{t.blurb}</span>
            </button>
          ))}
        </div>
        {onCancel && (
          <button type="button" className="text-btn" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
