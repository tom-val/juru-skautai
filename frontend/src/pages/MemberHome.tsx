import { Link, useParams } from "react-router-dom";
import MemberStatusGate from "../components/MemberStatusGate";
import { useMemberProgress } from "../hooks/useMemberProgress";
import { completedCount, getAbility, highestLevel } from "../lib/abilities";
import { memberPath } from "../lib/paths";

// Official emblem layout (rows: blue / red / green groups).
const EMBLEM = [
  "buriavimo", "irklavimo", "vandens",
  "saugumo", "virtuves", "vakaro",
  "medziu", "zygiu", "stovyklu",
];

export default function MemberHome() {
  const { memberId = "" } = useParams();
  const { member, checked, status, saveFailed } = useMemberProgress(memberId);

  return (
    <MemberStatusGate
      status={status}
      saveFailed={saveFailed}
      title="Laukinių įgūdžių gebėjimai"
      subtitle="Pasižymėk atliktus gebėjimus ir sek savo lygmenis. Pažanga saugoma tavo paskyroje."
    >
      <h2 className="greeting">Labas, {member?.firstName ?? ""}!</h2>

      <p className="emblem-label">Tavo emblema</p>
      <div className="emblem">
        {EMBLEM.map((slug) => {
          const a = getAbility(slug);
          if (!a) return null;
          const lvl = highestLevel(checked, a);
          return (
            <Link to={memberPath(memberId, slug)} key={slug} title={a.title}>
              <img
                src={`/assets/abilities/${slug}-${lvl || 1}.png`}
                alt={a.title}
                className={lvl ? "" : "dim"}
              />
            </Link>
          );
        })}
      </div>

      <div className="ability-grid">
        {EMBLEM.map((slug) => {
          const a = getAbility(slug);
          if (!a) return null;
          const lvl = highestLevel(checked, a);
          const done = completedCount(checked, a);
          return (
            <Link to={memberPath(memberId, a.slug)} className="ability-card" key={a.slug}>
              <div className="level-badge">
                <img
                  src={`/assets/abilities/${a.slug}-${lvl || 1}.png`}
                  alt=""
                  className={lvl ? "" : "dim"}
                />
              </div>
              <div className="ability-card-body">
                <h3>{a.title}</h3>
                <p>{done} iš {a.levels.length} lygmenų</p>
                <div className="progress-bar">
                  <span style={{ width: `${(done / a.levels.length) * 100}%` }} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </MemberStatusGate>
  );
}
