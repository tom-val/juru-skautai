import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ContentPage from "../components/ContentPage";

interface SongItem {
  title: string;
  body: string;
  hasChords: boolean;
  footnote: string;
}

// Expand every song, open the browser print dialog (where the user can "Save as
// PDF"), then restore the accordion to its previous state.
function printSongbook() {
  const details = Array.from(document.querySelectorAll<HTMLDetailsElement>(".songbook details"));
  const wasOpen = details.map((d) => d.open);
  details.forEach((d) => (d.open = true));
  const restore = () => {
    details.forEach((d, i) => (d.open = wasOpen[i]));
    window.removeEventListener("afterprint", restore);
  };
  window.addEventListener("afterprint", restore);
  window.print();
}

export default function Songbook() {
  const { t } = useTranslation();
  const songs = t("pages.songbook.songs", { returnObjects: true }) as SongItem[];
  return (
    <ContentPage title={t("pages.songbook.title")} subtitle={t("pages.songbook.subtitle")}>
      <h1 className="print-title">{t("pages.songbook.title")}</h1>
      <div className="prose no-print">
        <p>{t("pages.songbook.intro")}</p>
        <div className="songbook-actions">
          <button type="button" className="btn btn-sun" onClick={printSongbook}>
            {t("pages.songbook.print")}
          </button>
          <Link className="btn btn-outline" to="/daina">
            {t("pages.songbook.hymnLink")}
          </Link>
        </div>
      </div>

      <div className="songbook">
        {songs.map((song, i) => (
          <details key={i} open={i === 0}>
            <summary>
              <span className="song-sum">
                <span className="song-title">{song.title}</span>
                {song.hasChords && <span className="chord-chip">{t("pages.songbook.chords")}</span>}
              </span>
            </summary>
            <div className="ans">
              <pre className={song.hasChords ? "lyrics has-chords" : "lyrics"}>{song.body}</pre>
              {song.footnote && <p className="song-footnote">{song.footnote}</p>}
            </div>
          </details>
        ))}
      </div>

      <p className="song-source">{t("pages.songbook.source")}</p>
    </ContentPage>
  );
}
