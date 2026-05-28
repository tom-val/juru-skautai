import { useTranslation } from "react-i18next";

interface FaqItem {
  q: string;
  a: string;
}

export default function Faq() {
  const { t } = useTranslation();
  const items = t("faq.items", { returnObjects: true }) as FaqItem[];
  return (
    <section className="faq" id="faq">
      <div className="wrap">
        <div className="section-head center">
          <span className="eyebrow">{t("faq.eyebrow")}</span>
          <h2>{t("faq.title")}</h2>
        </div>
        <div className="faq-list">
          {items.map((item, i) => (
            <details key={i} open={i === 0}>
              <summary>{item.q}</summary>
              <div className="ans">{item.a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
