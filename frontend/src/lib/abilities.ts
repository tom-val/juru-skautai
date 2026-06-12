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

/** A level is complete when every task and every "Trys sutarimai" item is ticked. */
export function isLevelComplete(checked: Checked, slug: string, lvl: Level): boolean {
  const tasksDone = lvl.tasks.every((t) => checked[taskKey(slug, lvl.level, t.id)]);
  const sutDone = sutarimai.every((s) => checked[taskKey(slug, lvl.level, s.id)]);
  return tasksDone && sutDone;
}

/** Highest fully-completed level number (0 if none). */
export function highestLevel(checked: Checked, a: Ability): number {
  return a.levels.reduce((h, lvl) => (isLevelComplete(checked, a.slug, lvl) ? Math.max(h, lvl.level) : h), 0);
}

/** How many of the 8 levels are complete. */
export function completedCount(checked: Checked, a: Ability): number {
  return a.levels.filter((lvl) => isLevelComplete(checked, a.slug, lvl)).length;
}

/** Ticked items in a level / total items in a level (tasks + sutarimai). */
export function levelProgress(checked: Checked, slug: string, lvl: Level): [number, number] {
  const total = lvl.tasks.length + sutarimai.length;
  let done = 0;
  lvl.tasks.forEach((t) => checked[taskKey(slug, lvl.level, t.id)] && done++);
  sutarimai.forEach((s) => checked[taskKey(slug, lvl.level, s.id)] && done++);
  return [done, total];
}
