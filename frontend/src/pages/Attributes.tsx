import { useTranslation } from "react-i18next";
import ContentPage from "../components/ContentPage";

interface Qa {
  q: string;
  a: string;
}

interface Neckerchief {
  image: string;
  label: string;
}

export default function Attributes() {
  const { t } = useTranslation();
  const qa = t("pages.attributes.qa", { returnObjects: true }) as Qa[];
  const neckerchiefs = t("pages.attributes.neckerchiefs", { returnObjects: true }) as Neckerchief[];
  return (
    <ContentPage title={t("pages.attributes.title")}>
      <div className="prose">
        <p>{t("pages.attributes.intro")}</p>
      </div>

      <h2 className="page-h2">{t("pages.attributes.uniformTitle")}</h2>
      <p className="prose">{t("pages.attributes.uniformText")}</p>
      <figure className="page-figure wide">
        <img src="/assets/uniform-diagram.png" alt={t("pages.attributes.uniformTitle")} />
      </figure>

      <h2 className="page-h2">{t("pages.attributes.neckerchiefTitle")}</h2>
      <div className="neckerchiefs">
        {neckerchiefs.map((n, i) => (
          <figure key={i}>
            <img src={n.image} alt={n.label} />
            <figcaption>{n.label}</figcaption>
          </figure>
        ))}
      </div>

      <div className="prose">
        <div className="emblem-block">
          <img src="/assets/emblem.jpg" alt="Jūrų skautų ženklas" />
          <div>
            <h3>{t("pages.attributes.emblemTitle")}</h3>
            <p>{t("pages.attributes.emblem")}</p>
          </div>
        </div>
      </div>

      <div className="faq-list" style={{ marginTop: 32 }}>
        {qa.map((item, i) => (
          <details key={i} open={i === 0}>
            <summary>{item.q}</summary>
            <div className="ans">{item.a}</div>
          </details>
        ))}
      </div>

      <p className="prose" style={{ marginTop: 28 }}>
        <a
          className="btn btn-outline"
          href={t("pages.attributes.shopUrl")}
          target="_blank"
          rel="noreferrer"
        >
          {t("pages.attributes.shopLabel")} →
        </a>
      </p>
    </ContentPage>
  );
}
