import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const scoutRoutes = ["/skautu-ikurejas", "/istorija", "/atributika", "/daina", "/dainos", "/izodziai"];

export default function Footer() {
  const { t } = useTranslation();
  const scouts = t("footer.scouts", { returnObjects: true }) as string[];
  return (
    <footer>
      <div className="wrap">
        <div className="foot-grid">
          <div>
            <Link className="foot-brand" to="/" style={{ color: "#fff" }}>
              <span style={{ fontWeight: 900, fontSize: "1.2rem" }}>Jūrų Skautai</span>
            </Link>
            <p style={{ marginTop: 14, maxWidth: 280 }}>{t("footer.tagline")}</p>
            <div className="socials">
              <a href="https://www.facebook.com/LSjuruskautai/" title="Facebook" target="_blank" rel="noreferrer">
                f
              </a>
              <a href="https://www.instagram.com/juruskautai/" title="Instagram" target="_blank" rel="noreferrer">
                ◎
              </a>
              <a href="https://www.youtube.com/watch?v=f8gGEO3YIvM" title="YouTube" target="_blank" rel="noreferrer">
                ▶
              </a>
            </div>
          </div>
          <div>
            <h4>{t("footer.scoutsTitle")}</h4>
            {scouts.map((label, i) => (
              <Link to={scoutRoutes[i]} key={i}>
                {label}
              </Link>
            ))}
          </div>
          <div>
            <h4>{t("footer.leadersTitle")}</h4>
            <a href={t("pages.library.url")} target="_blank" rel="noreferrer">
              {t("footer.library")}
            </a>
            <Link to="/#parama">{t("nav.support")}</Link>
            <Link to="/#faq">{t("nav.faq")}</Link>
            <Link to="/#kontaktai">{t("nav.contact")}</Link>
          </div>
          <div>
            <h4>{t("footer.linksTitle")}</h4>
            <a href="https://skautai.lt" target="_blank" rel="noreferrer">
              Skautai.lt
            </a>
            <a href="https://parduotuve.skautai.lt/" target="_blank" rel="noreferrer">
              Skautiška parduotuvė
            </a>
            <a href="https://skautaineskautams.lt/" target="_blank" rel="noreferrer">
              Skautai neskautams
            </a>
            <a href="https://www.scout.org" target="_blank" rel="noreferrer">
              WOSM
            </a>
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
