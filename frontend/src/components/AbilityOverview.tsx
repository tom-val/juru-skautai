import { Link } from "react-router-dom";
import type { Progress } from "../lib/api";
import { completedCount, getAbility, highestLevel, pendingKeys } from "../lib/abilities";

// Official emblem layout (rows: blue / red / green groups).
const EMBLEM = [
  "buriavimo", "irklavimo", "vandens",
  "saugumo", "virtuves", "vakaro",
  "medziu", "zygiu", "stovyklu",
];

interface Props {
  progress: Progress;
  /** Where an ability tile/card links to (member or lead view). */
  linkTo: (slug: string) => string;
  emblemLabel?: string;
}

/** The 3×3 emblem plus one card per ability; shared by the member and lead views. */
export default function AbilityOverview({ progress, linkTo, emblemLabel = "Tavo emblema" }: Props) {
  return (
    <>
      <p className="emblem-label">{emblemLabel}</p>
      <div className="emblem">
        {EMBLEM.map((slug) => {
          const a = getAbility(slug);
          if (!a) return null;
          const lvl = highestLevel(progress, a);
          return (
            <Link to={linkTo(slug)} key={slug} title={a.title}>
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
          const lvl = highestLevel(progress, a);
          const done = completedCount(progress, a);
          const waiting = pendingKeys(progress, a.slug).length;
          return (
            <Link to={linkTo(a.slug)} className="ability-card" key={a.slug}>
              <div className="level-badge">
                <img
                  src={`/assets/abilities/${a.slug}-${lvl || 1}.png`}
                  alt=""
                  className={lvl ? "" : "dim"}
                />
              </div>
              <div className="ability-card-body">
                <h3>{a.title}</h3>
                <p>
                  {done} iš {a.levels.length} lygmenų
                  {waiting > 0 && <span className="pending-pill">{waiting} laukia</span>}
                </p>
                <div className="progress-bar">
                  <span style={{ width: `${(done / a.levels.length) * 100}%` }} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
