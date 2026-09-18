import type { Progress } from "../lib/api";
import {
  type Ability,
  type Task,
  sutarimai,
  taskKey,
  isLevelAchieved,
  levelProgress,
  pendingInLevel,
} from "../lib/abilities";

interface Props {
  ability: Ability;
  progress: Progress;
  /** member: ticks are claims awaiting a lead; lead: ticks confirm, unticks reject. */
  mode: "member" | "lead";
  onSet: (keys: string | string[], ticked: boolean) => void;
}

/**
 * The level cards for one ability. Confirmed items are struck through; items a
 * member ticked but no lead has confirmed yet are highlighted in yellow. Members
 * cannot touch confirmed items; leads get confirm / reject controls on pending ones.
 */
export default function AbilityLevels({ ability, progress, mode, onSet }: Props) {
  const slug = ability.slug;

  const renderItem = (key: string, item: Task) => {
    const state = progress[key];
    const cls = state === "pending" ? "pending" : state === "done" ? "done" : "";
    // Member: the box shows what they claimed (pending or done). Lead: only confirmed.
    const ticked = mode === "member" ? state !== undefined : state === "done";
    const locked = mode === "member" && state === "done";
    return (
      <li key={key} className={cls}>
        <label>
          <input
            type="checkbox"
            checked={ticked}
            disabled={locked}
            onChange={() => onSet(key, !ticked)}
          />
          <span>{item.text}</span>
        </label>
        {state === "pending" && mode === "member" && (
          <span className="pending-tag">Laukia vadovo patvirtinimo</span>
        )}
        {state === "pending" && mode === "lead" && (
          <span className="pending-actions">
            <button type="button" className="btn btn-sm btn-confirm" onClick={() => onSet(key, true)}>
              Patvirtinti
            </button>
            <button type="button" className="btn btn-sm btn-reject" onClick={() => onSet(key, false)}>
              Atmesti
            </button>
          </span>
        )}
      </li>
    );
  };

  return (
    <div className="levels">
      {ability.levels.map((lvl) => {
        const achieved = isLevelAchieved(progress, ability, lvl);
        const [done, pending, total] = levelProgress(progress, slug, lvl);
        const waiting = pendingInLevel(progress, slug, lvl);
        // Everything confirmed here, but an earlier level is unfinished — no credit yet.
        const locked = !achieved && done === total;
        const cardCls = achieved ? " complete" : waiting.length ? " has-pending" : "";

        let statusText: string;
        if (achieved) statusText = "✓ Pasiektas";
        else if (locked) statusText = "🔒 Užbaik ankstesnius lygmenis";
        else if (mode === "member" && pending > 0) {
          statusText = `${done} / ${total} · ${pending} laukia patvirtinimo`;
        } else if (mode === "lead" && pending > 0) {
          statusText = `${done} / ${total} · ${pending} laukia`;
        } else statusText = `${done} / ${total}`;

        return (
          <div className={`level-card${cardCls}`} key={lvl.level}>
            <div className="level-head">
              <div className="level-head-l">
                <img
                  className={`level-icon${achieved ? "" : " dim"}`}
                  src={`/assets/abilities/${slug}-${lvl.level}.png`}
                  alt=""
                />
                <h3>{lvl.level} lygmuo</h3>
              </div>
              <div className="level-head-r">
                <span className="level-status">{statusText}</span>
                {mode === "lead" && waiting.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-sm btn-confirm"
                    onClick={() => onSet(waiting, true)}
                  >
                    Patvirtinti visus ({waiting.length})
                  </button>
                )}
              </div>
            </div>

            <ul className="checks">
              {lvl.tasks.map((task) => renderItem(taskKey(slug, lvl.level, task.id), task))}
            </ul>

            <div className="sutarimai">
              <span className="sutarimai-title">Trys sutarimai · aš, vienetas, vadovas</span>
              <ul className="checks">
                {sutarimai.map((s) => renderItem(taskKey(slug, lvl.level, s.id), s))}
              </ul>
            </div>
          </div>
        );
      })}
    </div>
  );
}
