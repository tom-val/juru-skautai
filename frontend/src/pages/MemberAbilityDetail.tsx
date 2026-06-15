import { useParams, Link, Navigate } from "react-router-dom";
import MemberStatusGate from "../components/MemberStatusGate";
import { useMemberProgress } from "../hooks/useMemberProgress";
import {
  getAbility,
  sutarimai,
  taskKey,
  isLevelAchieved,
  isLevelFilled,
  levelProgress,
} from "../lib/abilities";
import { memberPath } from "../lib/paths";

export default function MemberAbilityDetail() {
  const { memberId = "", slug = "" } = useParams();
  const { checked, toggle, status, saveFailed } = useMemberProgress(memberId);
  const ability = getAbility(slug);

  if (!ability) return <Navigate to={memberPath(memberId)} replace />;

  return (
    <MemberStatusGate
      status={status}
      saveFailed={saveFailed}
      title={ability.title}
      subtitle="Pažymėk atliktus gebėjimus. Lygmuo pasiektas, kai pažymėti visi punktai ir užbaigti ankstesni lygmenys."
    >
      <div className="back-row">
        <Link to={memberPath(memberId)} className="btn btn-outline">
          ← Visi gebėjimai
        </Link>
      </div>

      <div className="levels">
        {ability.levels.map((lvl) => {
          const achieved = isLevelAchieved(checked, ability, lvl);
          // All items ticked, but an earlier level is unfinished — does not count yet.
          const locked = !achieved && isLevelFilled(checked, slug, lvl);
          const [done, total] = levelProgress(checked, slug, lvl);
          return (
            <div className={`level-card${achieved ? " complete" : ""}`} key={lvl.level}>
              <div className="level-head">
                <div className="level-head-l">
                  <img
                    className={`level-icon${achieved ? "" : " dim"}`}
                    src={`/assets/abilities/${slug}-${lvl.level}.png`}
                    alt=""
                  />
                  <h3>{lvl.level} lygmuo</h3>
                </div>
                <span className="level-status">
                  {achieved
                    ? "✓ Pasiektas"
                    : locked
                      ? "🔒 Užbaik ankstesnius lygmenis"
                      : `${done} / ${total}`}
                </span>
              </div>

              <ul className="checks">
                {lvl.tasks.map((task) => {
                  const key = taskKey(slug, lvl.level, task.id);
                  return (
                    <li key={key}>
                      <label>
                        <input type="checkbox" checked={!!checked[key]} onChange={() => toggle(key)} />
                        <span>{task.text}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>

              <div className="sutarimai">
                <span className="sutarimai-title">Trys sutarimai · aš, vienetas, vadovas</span>
                <ul className="checks">
                  {sutarimai.map((s) => {
                    const key = taskKey(slug, lvl.level, s.id);
                    return (
                      <li key={key}>
                        <label>
                          <input type="checkbox" checked={!!checked[key]} onChange={() => toggle(key)} />
                          <span>{s.text}</span>
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
    </MemberStatusGate>
  );
}
