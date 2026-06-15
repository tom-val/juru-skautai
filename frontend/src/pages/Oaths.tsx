import { useTranslation } from "react-i18next";
import ContentPage from "../components/ContentPage";

interface OathItem {
  rank: string;
  text: string;
  note: string;
}

export default function Oaths() {
  const { t } = useTranslation();
  const items = t("pages.oaths.items", { returnObjects: true }) as OathItem[];
  return (
    <ContentPage title={t("pages.oaths.title")} subtitle={t("pages.oaths.subtitle")}>
      <div className="prose">
        <p>{t("pages.oaths.intro")}</p>
      </div>

      <h2 className="page-h2">{t("pages.oaths.prayer.title")}</h2>
      <div className="prose" style={{ marginBottom: 18 }}>
        <p>{t("pages.oaths.prayer.intro")}</p>
      </div>
      <blockquote className="prayer-text">{t("pages.oaths.prayer.text")}</blockquote>

      <h2 className="page-h2">{t("pages.oaths.oathsTitle")}</h2>
      <ol className="oaths">
        {items.map((it, i) => (
          <li key={i}>
            <span className="oath-rank">{it.rank}</span>
            <blockquote className="oath-text">{it.text}</blockquote>
            {it.note && <p className="oath-note">{it.note}</p>}
          </li>
        ))}
      </ol>
    </ContentPage>
  );
}
