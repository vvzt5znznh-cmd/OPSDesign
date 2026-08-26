import { useLang } from "./i18n";

export function HelpModal({ onClose }: { onClose: () => void }) {
  const { t } = useLang();
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal wide"
        role="dialog"
        aria-labelledby="help-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="help-title">{t.helpTitle}</h2>
        <p>{t.helpIntro}</p>
        <div className="help-grid">
          <div>
            <h3>{t.endState}</h3>
            <p>{t.helpEndState}</p>
          </div>
          <div>
            <h3>{t.phases}</h3>
            <p>{t.helpPhases}</p>
          </div>
          <div>
            <h3>{t.workstreams}</h3>
            <p>{t.helpWorkstreams}</p>
          </div>
          <div>
            <h3>{t.milestone} △</h3>
            <p>{t.helpMilestone}</p>
          </div>
          <div>
            <h3>{t.condition} ◇</h3>
            <p>{t.helpCondition}</p>
          </div>
          <div>
            <h3>{t.gate} ★</h3>
            <p>{t.helpGate}</p>
          </div>
        </div>
        <div className="help-products">
          <h3>{t.helpFromTitle}</h3>
          <p>{t.helpFromWall}</p>
          <p>{t.helpFromWalk}</p>
          <p>{t.helpFromAnnex}</p>
        </div>
        <p className="help-how">{t.helpHow}</p>
        <p className="help-how">{t.helpPersist}</p>
        <button type="button" className="modal-close" onClick={onClose}>
          {t.close}
        </button>
      </div>
    </div>
  );
}
