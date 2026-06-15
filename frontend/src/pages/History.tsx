import { useTranslation } from "react-i18next";
import ContentPage from "../components/ContentPage";

interface Period {
  range: string;
  paragraphs: string[];
}

interface Flag {
  image: string;
  label: string;
}

interface Figure {
  image: string;
  caption: string;
}

interface Chapter {
  title: string;
  paragraphs: string[];
  figures: Figure[];
}

export default function History() {
  const { t } = useTranslation();
  const intro = t("pages.history.intro", { returnObjects: true }) as string[];
  const mottos = t("pages.history.mottos", { returnObjects: true }) as string[];
  const periods = t("pages.history.periods", { returnObjects: true }) as Period[];
  const flagMain = t("pages.history.flagMain", { returnObjects: true }) as Flag[];
  const flags = t("pages.history.flags", { returnObjects: true }) as Flag[];
  const maritimeChapters = t("pages.history.maritime.chapters", { returnObjects: true }) as Chapter[];
  return (
    <ContentPage title={t("pages.history.title")}>
      <div className="prose">
        {intro.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        <h3>{t("pages.history.mottoTitle")}</h3>
        <ul className="bullets">
          {mottos.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ul>
      </div>

      <h2 className="page-h2">{t("pages.history.flagMainTitle")}</h2>
      <div className="flag-main">
        {flagMain.map((flag, i) => (
          <figure key={i}>
            <img src={flag.image} alt={flag.label} />
            <figcaption>{flag.label}</figcaption>
          </figure>
        ))}
      </div>

      <figure className="page-figure narrow">
        <img src="/assets/hist-download.jpg" alt={t("pages.history.bookCaption")} />
        <figcaption>{t("pages.history.bookCaption")}</figcaption>
      </figure>

      <h2 className="page-h2">{t("pages.history.timelineTitle")}</h2>
      <ol className="timeline">
        {periods.map((period, i) => (
          <li key={i}>
            <span className="yr">{period.range}</span>
            <div>
              {period.paragraphs.map((p, j) => (
                <p key={j}>{p}</p>
              ))}
            </div>
          </li>
        ))}
      </ol>

      <h2 className="page-h2">{t("pages.history.flagsTitle")}</h2>
      <div className="flags">
        {flags.map((flag, i) => (
          <figure key={i}>
            <img src={flag.image} alt={flag.label} />
            <figcaption>{flag.label}</figcaption>
          </figure>
        ))}
      </div>

      <h2 className="page-h2">{t("pages.history.maritime.title")}</h2>
      <div className="prose">
        <p>{t("pages.history.maritime.intro")}</p>
      </div>
      {maritimeChapters.map((chapter, i) => (
        <section className="hist-chapter" key={i}>
          <h3 className="hist-h3">{chapter.title}</h3>
          <div className="prose">
            {chapter.paragraphs.map((p, j) => (
              <p key={j}>{p}</p>
            ))}
          </div>
          {chapter.figures.length > 0 && (
            <div className="hist-figs">
              {chapter.figures.map((fig, k) => (
                <figure key={k}>
                  <img src={fig.image} alt={fig.caption} loading="lazy" />
                  <figcaption>{fig.caption}</figcaption>
                </figure>
              ))}
            </div>
          )}
        </section>
      ))}
    </ContentPage>
  );
}
