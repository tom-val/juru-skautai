import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
        <Link className="brand" to="/">
          <img src="/assets/emblem-removebg.png" alt="Jūrų skautai" />
          <span>Jūrų&nbsp;Skautai</span>
        </Link>
        <nav className={`nav-links${menuOpen ? " open" : ""}`} onClick={() => setMenuOpen(false)}>
          <Link to="/#apie">{t("nav.about")}</Link>
          <Link to="/#grupes">{t("nav.ageGroups")}</Link>
          <Link to="/#faq">{t("nav.faq")}</Link>
          <Link to="/#parama">{t("nav.support")}</Link>
          <Link to="/#kontaktai">{t("nav.contact")}</Link>
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
          <Link to="/#kontaktai" className="btn btn-sun" style={{ padding: "10px 20px" }}>
            {t("nav.cta")}
          </Link>
          <button className="burger" onClick={() => setMenuOpen((o) => !o)} aria-label="Menu">
            ☰
          </button>
        </div>
      </div>
    </header>
  );
}
