import { useTranslation } from "react-i18next";
import ContentPage from "../components/ContentPage";

export default function Song() {
  const { t } = useTranslation();
  return (
    <ContentPage title={t("pages.song.title")} subtitle={t("pages.song.hymnTitle")}>
      <div className="song-grid">
        <div className="video-wrap">
          <iframe
            src={t("pages.song.videoUrl")}
            title={t("pages.song.songName")}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <div>
          <h3 className="page-h2" style={{ marginTop: 0 }}>
            {t("pages.song.songName")}
          </h3>
          <pre className="lyrics">{t("pages.song.lyrics")}</pre>
        </div>
      </div>
    </ContentPage>
  );
}
