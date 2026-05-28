import { useTranslation } from "react-i18next";

export default function Hero() {
  const { t } = useTranslation();
  return (
    <div className="hero" id="top">
      <div className="wrap hero-grid">
        <div>
          <h1>
            <span className="hl">{t("hero.title")}</span>
          </h1>
          <p className="lead">{t("hero.lead")}</p>
          <div className="hero-cta">
            <a href="#kontaktai" className="btn btn-sun">
              {t("hero.ctaPrimary")}
            </a>
            <a href="#apie" className="btn btn-ghost">
              {t("hero.ctaSecondary")}
            </a>
          </div>
        </div>
        <div className="hero-art">
          <div className="float">
            <img src="/assets/emblem-removebg.png" alt="" />
            <div>
              <div style={{ fontWeight: 900 }}>{t("hero.motto")}</div>
              <div style={{ fontSize: ".85rem", color: "#43586c" }}>{t("hero.mottoLabel")}</div>
            </div>
          </div>
        </div>
      </div>
      <svg className="wave" viewBox="0 0 1440 70" preserveAspectRatio="none">
        <path
          fill="#ffffff"
          d="M0,40 C240,80 480,0 720,30 C960,60 1200,10 1440,40 L1440,70 L0,70 Z"
        />
      </svg>
    </div>
  );
}
