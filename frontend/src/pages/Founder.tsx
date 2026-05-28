import { useTranslation } from "react-i18next";
import ContentPage from "../components/ContentPage";

interface Entry {
  year: string;
  text: string;
}

export default function Founder() {
  const { t } = useTranslation();
  const timeline = t("pages.founder.timeline", { returnObjects: true }) as Entry[];
  return (
    <ContentPage title={t("pages.founder.title")} subtitle={t("pages.founder.subtitle")}>
      <div className="prose">
        <p>{t("pages.founder.intro")}</p>
      </div>
      <figure className="page-figure portrait-end">
        <img src="/assets/founder-portrait.gif" alt={t("pages.founder.portraitCaption")} />
        <figcaption>{t("pages.founder.portraitCaption")}</figcaption>
      </figure>
      <ol className="timeline">
        {timeline.map((entry, i) => (
          <li key={i}>
            <span className="yr">{entry.year}</span>
            <p>{entry.text}</p>
          </li>
        ))}
      </ol>

      <figure className="page-figure">
        <img src="/assets/founder-jamboree.jpg" alt={t("pages.founder.photoCaption")} />
        <figcaption>{t("pages.founder.photoCaption")}</figcaption>
      </figure>
    </ContentPage>
  );
}
