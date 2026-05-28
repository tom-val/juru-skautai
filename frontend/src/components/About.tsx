import { useTranslation } from "react-i18next";

const icons = ["⚓", "🧭", "⛺"];

export default function About() {
  const { t } = useTranslation();
  const points = t("about.points", { returnObjects: true }) as string[];
  return (
    <section id="apie">
      <div className="wrap split">
        <div className="photo-card">
          <img src="/assets/photo2.jpg" alt="" />
        </div>
        <div>
          <span className="eyebrow">{t("about.eyebrow")}</span>
          <h2 style={{ fontSize: "clamp(1.9rem,3.5vw,2.6rem)", margin: "12px 0 14px" }}>
            {t("about.title")}
          </h2>
          <p style={{ color: "#43586c", fontSize: "1.08rem" }}>{t("about.text")}</p>
          <ul className="check-list">
            {points.map((point, i) => (
              <li key={i}>
                <span className="ic">{icons[i]}</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
