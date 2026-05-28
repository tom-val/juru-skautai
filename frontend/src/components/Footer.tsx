import { useTranslation } from "react-i18next";

export default function Footer() {
  const { t } = useTranslation();
  const scouts = t("footer.scouts", { returnObjects: true }) as string[];
  return (
    <footer>
      <div className="wrap">
        <div className="foot-grid">
          <div>
            <a className="foot-brand" href="#top" style={{ color: "#fff" }}>
              <span style={{ fontWeight: 900, fontSize: "1.2rem" }}>Jūrų Skautai</span>
            </a>
            <p style={{ marginTop: 14, maxWidth: 280 }}>{t("footer.tagline")}</p>
            <div className="socials">
              <a href="https://www.facebook.com/LSjuruskautai" title="Facebook">
                f
              </a>
              <a href="#" title="Instagram">
                ◎
              </a>
              <a href="#" title="YouTube">
                ▶
              </a>
            </div>
          </div>
          <div>
            <h4>{t("footer.scoutsTitle")}</h4>
            {scouts.map((label, i) => (
              <a href="#" key={i}>
                {label}
              </a>
            ))}
          </div>
          <div>
            <h4>{t("footer.leadersTitle")}</h4>
            <a href="#parama">{t("nav.support")}</a>
            <a href="#faq">{t("nav.faq")}</a>
            <a href="#kontaktai">{t("nav.contact")}</a>
          </div>
          <div>
            <h4>{t("footer.linksTitle")}</h4>
            <a href="https://skautai.lt">Skautai.lt</a>
            <a href="https://www.scout.org">WOSM</a>
          </div>
        </div>
        <div className="foot-bottom">
          <span>
            © {new Date().getFullYear()} LS Jūrų skautai · {t("footer.rights")}
          </span>
          <span>Dievui · Tėvynei · Artimui · Jūrai!</span>
        </div>
      </div>
    </footer>
  );
}
