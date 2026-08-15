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
          Build a CONOPS picture from the structure of the operation — phases,
          lines of effort, decision points, and an end state. The diagram lays
          itself out. You edit the design.
        </p>
        <div className="template-grid">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              className="template-card"
              onClick={() => onChoose(t.create())}
            >
              <span className="template-kind">
                {t.nodeKind === "milestone" ? "Milestones" : "Decisive conditions"}
              </span>
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
