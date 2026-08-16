import { TEMPLATES } from "./templates";
import { useTheme } from "./theme";
import type { OperationalDesign } from "./types";

export function Welcome({
  onChoose,
  onCancel,
}: {
  onChoose: (design: OperationalDesign) => void;
  onCancel?: () => void;
}) {
  const { theme, toggleTheme } = useTheme();
  return (
    <div className={onCancel ? "welcome overlay" : "welcome"}>
      <button
        type="button"
        className={theme === "dark" ? "theme-welcome on" : "theme-welcome"}
        onClick={toggleTheme}
        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        aria-pressed={theme === "dark"}
      >
        Dark
      </button>
      <div className="welcome-inner">
        <div className="welcome-hero">
          <p className="eyebrow">Operational design</p>
          <h1>OPSDesign</h1>
          <p className="lede">
            Draw the project as concurrent workstreams, gates, and an outcome.
            The picture lays itself out.
          </p>
        </div>
        <MiniConops />
        <div className="template-grid">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={t.id === "project" ? "template-card featured" : "template-card"}
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
            Back to the current picture
          </button>
        )}
      </div>
    </div>
  );
}

function MiniConops() {
  return (
    <svg className="mini-conops" viewBox="0 0 420 92" aria-hidden>
      <text x="48" y="14" className="mini-phase">
        Discover
      </text>
      <text x="148" y="14" className="mini-phase">
        Define
      </text>
      <text x="248" y="14" className="mini-phase">
        Build
      </text>
      <text x="372" y="14" className="mini-phase" letterSpacing="0.08em">
        END STATE
      </text>
      <line x1="20" y1="40" x2="348" y2="40" stroke="#E87722" strokeWidth="7" strokeLinecap="round" />
      <line x1="20" y1="58" x2="348" y2="58" stroke="#5B8C2A" strokeWidth="7" strokeLinecap="round" />
      <line x1="20" y1="76" x2="348" y2="76" stroke="#3D9AD1" strokeWidth="7" strokeLinecap="round" />
      <path d="M92,32 L98,46 L86,46 Z" fill="#C62828" />
      <path d="M188,40 L196,48 L188,56 L180,48 Z" fill="#0F4C81" />
      <path d="M258,32 L264,46 L252,46 Z" fill="#C62828" />
      <path d="M118,50 L126,58 L118,66 L110,58 Z" fill="#0F4C81" />
      <polygon points="140,22 143,28 150,28 145,32 147,38 140,34 133,38 135,32 130,28 137,28" fill="#2E7D32" />
      <polygon points="240,22 243,28 250,28 245,32 247,38 240,34 233,38 235,32 230,28 237,28" fill="#2E7D32" />
      <rect x="348" y="32" width="56" height="52" rx="7" fill="#5A6A78" fillOpacity="0.22" stroke="#5A6A78" strokeOpacity="0.55" />
      <text x="376" y="52" textAnchor="middle" fill="#1a1f2b" fontSize="8" fontWeight="700">
        LIVE
      </text>
      <text x="376" y="66" textAnchor="middle" fill="#5c6570" fontSize="6">
        in use
      </text>
    </svg>
  );
}
