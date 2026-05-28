import { useTranslation } from "react-i18next";

interface WhyCard {
  icon: string;
  title: string;
  text: string;
}

export default function WhyJoin() {
  const { t } = useTranslation();
  const cards = t("why.cards", { returnObjects: true }) as WhyCard[];
  return (
    <section className="why" id="prisijunk">
      <div className="wrap">
        <div className="section-head center">
          <span className="eyebrow">{t("why.eyebrow")}</span>
          <h2>{t("why.title")}</h2>
        </div>
        <div className="why-grid">
          {cards.map((card, i) => (
            <div className="why-card" key={i}>
              <div className="ic">{card.icon}</div>
              <h3>{card.title}</h3>
              <p>{card.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
