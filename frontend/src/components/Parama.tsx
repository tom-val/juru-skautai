import { useTranslation } from "react-i18next";

interface ReqRow {
  label: string;
  value: string;
}

export default function Parama() {
  const { t } = useTranslation();
  const steps = t("parama.steps", { returnObjects: true }) as string[];
  const req = t("parama.req", { returnObjects: true }) as ReqRow[];
  const ways = t("parama.ways", { returnObjects: true }) as string[];
  return (
    <section id="parama">
      <div className="wrap">
        <div className="section-head center">
          <span className="eyebrow">{t("parama.eyebrow")}</span>
          <h2>{t("parama.title")}</h2>
          <p>{t("parama.subtitle")}</p>
        </div>
        <div className="faq-list">
          <details>
            <summary>{t("parama.stepsTitle")}</summary>
            <div className="ans">
              <ol className="steps">
                {steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          </details>
          <details>
            <summary>{t("parama.reqTitle")}</summary>
            <div className="ans">
              {req.map((row, i) => (
                <div className="req-row" key={i}>
                  <span>{row.label}</span>
                  <span>{row.value}</span>
                </div>
              ))}
              <p className="note">{t("parama.reqNote")}</p>
            </div>
          </details>
          <details>
            <summary>{t("parama.waysTitle")}</summary>
            <div className="ans">
              <div className="chips">
                {ways.map((way, i) => (
                  <span key={i}>{way}</span>
                ))}
              </div>
              <p className="note">{t("parama.waysNote")}</p>
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}
