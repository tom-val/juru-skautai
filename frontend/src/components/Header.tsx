import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export default function Header() {
  const { t, i18n } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  const setLang = (lng: "lt" | "en") => void i18n.changeLanguage(lng);
  const lang = i18n.language.startsWith("en") ? "en" : "lt";

  return (
    <header>
      <div className="wrap nav">
        <a className="brand" href="#top">
          <img src="/assets/emblem-removebg.png" alt="Jūrų skautai" />
          <span>Jūrų&nbsp;Skautai</span>
        </a>
        <nav className={`nav-links${menuOpen ? " open" : ""}`} onClick={() => setMenuOpen(false)}>
          <a href="#apie">{t("nav.about")}</a>
          <a href="#grupes">{t("nav.ageGroups")}</a>
          <a href="#faq">{t("nav.faq")}</a>
          <a href="#parama">{t("nav.support")}</a>
          <a href="#kontaktai">{t("nav.contact")}</a>
        </nav>
        <div className="nav-actions">
          <div className="lang">
            <button className={lang === "lt" ? "active" : ""} onClick={() => setLang("lt")}>
              LT
            </button>
            <button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>
              EN
            </button>
          </div>
          <a href="#kontaktai" className="btn btn-sun" style={{ padding: "10px 20px" }}>
            {t("nav.cta")}
          </a>
          <button className="burger" onClick={() => setMenuOpen((o) => !o)} aria-label="Menu">
            ☰
          </button>
        </div>
      </div>
    </header>
  );
}
