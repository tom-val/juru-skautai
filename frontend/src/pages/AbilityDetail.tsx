import { useParams, Link, Navigate } from "react-router-dom";
import ContentPage from "../components/ContentPage";
import { useProgress } from "../hooks/useProgress";
import {
  getAbility,
  sutarimai,
  taskKey,
  sutKey,
  isLevelComplete,
  levelProgress,
} from "../lib/abilities";

export default function AbilityDetail() {
  const { slug = "" } = useParams();
  const { checked, toggle } = useProgress();
  const ability = getAbility(slug);

  if (!ability) return <Navigate to="/gebejimai" replace />;

  return (
    <ContentPage title={ability.title} subtitle="Pažymėk atliktus gebėjimus. Lygmuo pasiektas, kai pažymėti visi punktai.">
      <div className="back-row">
        <Link to="/gebejimai" className="btn btn-outline">
          ← Visi gebėjimai
        </Link>
      </div>

      <div className="levels">
        {ability.levels.map((lvl) => {
          const complete = isLevelComplete(checked, slug, lvl);
          const [done, total] = levelProgress(checked, slug, lvl);
          return (
            <div className={`level-card${complete ? " complete" : ""}`} key={lvl.level}>
              <div className="level-head">
                <div className="level-head-l">
                  <img
                    className={`level-icon${complete ? "" : " dim"}`}
                    src={`/assets/abilities/${slug}-${lvl.level}.png`}
                    alt=""
                  />
                  <h3>{lvl.level} lygmuo</h3>
                </div>
                <span className="level-status">{complete ? "✓ Pasiektas" : `${done} / ${total}`}</span>
              </div>

              <ul className="checks">
                {lvl.tasks.map((task, i) => {
                  const key = taskKey(slug, lvl.level, i);
                  return (
                    <li key={key}>
                      <label>
                        <input type="checkbox" checked={!!checked[key]} onChange={() => toggle(key)} />
                        <span>{task}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>

              <div className="sutarimai">
                <span className="sutarimai-title">Trys sutarimai · aš, vienetas, vadovas</span>
                <ul className="checks">
                  {sutarimai.map((s, i) => {
                    const key = sutKey(slug, lvl.level, i);
                    return (
                      <li key={key}>
                        <label>
                          <input type="checkbox" checked={!!checked[key]} onChange={() => toggle(key)} />
                          <span>{s}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </ContentPage>
  );
}
