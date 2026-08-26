import { useLang } from "./i18n";
import { TEMPLATES } from "./templates";
import type { OperationalDesign } from "./types";

export function LayoutPicker({
  onChoose,
  onCancel,
}: {
  onChoose: (design: OperationalDesign) => void;
  onCancel?: () => void;
}) {
  const { lang, setLang, t } = useLang();
  const meta: Record<string, { name: string; blurb: string; tag: string }> = {
    blank: { name: t.tplBlank, blurb: t.tplBlankBlurb, tag: t.tplEmpty },
    project: { name: t.tplProject, blurb: t.tplProjectBlurb, tag: t.tplSample },
    military: { name: t.tplCampaign, blurb: t.tplCampaignBlurb, tag: t.tplSample },
    "epic-fury": { name: t.tplEpic, blurb: t.tplEpicBlurb, tag: t.tplSample },
  };

  return (
    <div
      className={onCancel ? "modal-backdrop" : "modal-backdrop first-open"}
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="modal wide"
        role="dialog"
        aria-labelledby="layout-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="layout-title">{t.pickerTitle}</h2>
        <p>{onCancel ? t.pickerIntroReplace : t.pickerIntro}</p>
        <div className="kind-toggle lang-toggle picker-lang" role="group" aria-label={t.langTitle}>
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
        <div className="template-grid">
          {TEMPLATES.map((item) => {
            const card = meta[item.id] ?? {
              name: item.name,
              blurb: item.blurb,
              tag: item.tag,
            };
            return (
              <button
                key={item.id}
                type="button"
                className={item.id === "blank" ? "template-card featured" : "template-card"}
                onClick={() => onChoose(item.create())}
              >
                <span className="template-kind">{card.tag}</span>
                <strong>{card.name}</strong>
                <span>{card.blurb}</span>
              </button>
            );
          })}
        </div>
        {onCancel && (
          <button type="button" className="modal-close" onClick={onCancel}>
            {t.cancel}
          </button>
        )}
      </div>
    </div>
  );
}
