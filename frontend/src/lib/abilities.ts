import raw from "../data/abilities.json";

// Tasks carry stable IDs ("t1", "t2", … / "s1"–"s3") so stored progress keys keep
// their meaning even if tasks are later inserted or reordered in abilities.json.
// Never renumber existing IDs — new tasks get the next unused number.
export interface Task {
  id: string;
  text: string;
}

export interface Level {
  level: number;
  tasks: Task[];
}

export interface Ability {
  slug: string;
  title: string;
  levels: Level[];
}

type Checked = Record<string, boolean>;

export const sutarimai: Task[] = raw.sutarimai;
export const abilities: Ability[] = raw.abilities as Ability[];

export const getAbility = (slug: string): Ability | undefined =>
  abilities.find((a) => a.slug === slug);

export const taskKey = (slug: string, level: number, taskId: string) =>
  `${slug}/${level}/${taskId}`;

/** A level is "filled" when every task and every "Trys sutarimai" item in it is ticked. */
export function isLevelFilled(checked: Checked, slug: string, lvl: Level): boolean {
  const tasksDone = lvl.tasks.every((t) => checked[taskKey(slug, lvl.level, t.id)]);
  const sutDone = sutarimai.every((s) => checked[taskKey(slug, lvl.level, s.id)]);
  return tasksDone && sutDone;
}

/**
 * A level counts as achieved only when it is filled *and* every lower level is too.
 * Progress is strictly sequential — ticking everything in a higher level earns nothing
 * until the earlier levels are done.
 */
export function isLevelAchieved(checked: Checked, a: Ability, lvl: Level): boolean {
  return a.levels.every((l) => l.level > lvl.level || isLevelFilled(checked, a.slug, l));
}

/** The unbroken run of filled levels from the lowest upward (where the credit stops). */
function achievedLevels(checked: Checked, a: Ability): Level[] {
  const ordered = [...a.levels].sort((x, y) => x.level - y.level);
  const run: Level[] = [];
  for (const lvl of ordered) {
    if (!isLevelFilled(checked, a.slug, lvl)) break;
    run.push(lvl);
  }
  return run;
}

/** Highest achieved level number (0 if none) — the top of the unbroken run from level 1. */
export function highestLevel(checked: Checked, a: Ability): number {
  const run = achievedLevels(checked, a);
  return run.length ? run[run.length - 1].level : 0;
}

/** How many levels are achieved — the length of the unbroken run from level 1. */
export function completedCount(checked: Checked, a: Ability): number {
  return achievedLevels(checked, a).length;
}

/** Ticked items in a level / total items in a level (tasks + sutarimai). */
export function levelProgress(checked: Checked, slug: string, lvl: Level): [number, number] {
  const total = lvl.tasks.length + sutarimai.length;
  let done = 0;
  lvl.tasks.forEach((t) => checked[taskKey(slug, lvl.level, t.id)] && done++);
  sutarimai.forEach((s) => checked[taskKey(slug, lvl.level, s.id)] && done++);
  return [done, total];
}
