import { useTranslation } from "react-i18next";

interface Tunt {
  name: string;
  leader: string;
  email: string;
}

export default function Contact() {
  const { t } = useTranslation();
  const tunts = t("contact.tunts", { returnObjects: true }) as Tunt[];
  return (
    <section className="contact" id="kontaktai">
      <div className="wrap">
        <div className="section-head">
          <span className="eyebrow" style={{ color: "var(--sun)" }}>
            {t("contact.eyebrow")}
          </span>
          <h2>{t("contact.title")}</h2>
          <p>{t("contact.subtitle")}</p>
        </div>
        <div className="contact-grid">
          <div>
            <div className="info-row">
              <div className="ic">📍</div>
              <div>
                <div className="t">{t("contact.visitLabel")}</div>
                <div className="v">{t("contact.address")}</div>
              </div>
            </div>
            <div className="info-row">
              <div className="ic">✉️</div>
              <div>
                <div className="t">{t("contact.writeLabel")}</div>
                <div className="v">
                  <a href={`mailto:${t("contact.email")}`}>{t("contact.email")}</a>
                </div>
              </div>
            </div>
            <div className="info-row">
              <div className="ic">📞</div>
              <div>
                <div className="t">{t("contact.callLabel")}</div>
                <div className="v">{t("contact.phone")}</div>
              </div>
            </div>
            <div className="info-row" style={{ border: 0 }}>
              <div className="ic">💬</div>
              <div>
                <div className="t">{t("contact.followLabel")}</div>
                <div className="v">{t("contact.social")}</div>
              </div>
            </div>
          </div>
          <div className="map">
            <iframe
              loading="lazy"
              title="Žemėlapis"
              src="https://www.google.com/maps?q=Trak%C5%B3%20g.%2018%2C%20Kaunas&output=embed"
            />
          </div>
        </div>

        <div className="tunts-head">
          <h3>{t("contact.tuntsTitle")}</h3>
          <p>{t("contact.tuntsSubtitle")}</p>
        </div>
        <div className="tunts">
          {tunts.map((tunt, i) => (
            <div className="tunt-card" key={i}>
              <h4>{tunt.name}</h4>
              <div className="who">👤 {tunt.leader}</div>
              <a href={`mailto:${tunt.email}`}>✉️ {tunt.email}</a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
