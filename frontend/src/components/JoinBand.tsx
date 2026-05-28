import { useTranslation } from "react-i18next";

export default function JoinBand() {
  const { t } = useTranslation();
  return (
    <section style={{ paddingTop: 0 }}>
      <div className="wrap">
        <div className="join">
          <h2>{t("join.title")}</h2>
          <p>{t("join.text")}</p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="#kontaktai" className="btn btn-sun">
              {t("join.contact")}
            </a>
            <a href="#faq" className="btn btn-ghost">
              {t("join.faq")}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
