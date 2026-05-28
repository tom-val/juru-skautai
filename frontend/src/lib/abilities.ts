import raw from "../data/abilities.json";

export interface Level {
  level: number;
  tasks: string[];
}

export interface Ability {
  slug: string;
  title: string;
  levels: Level[];
}

type Checked = Record<string, boolean>;

export const sutarimai: string[] = raw.sutarimai;
export const abilities: Ability[] = raw.abilities as Ability[];

export const getAbility = (slug: string): Ability | undefined =>
  abilities.find((a) => a.slug === slug);

export const taskKey = (slug: string, level: number, i: number) => `${slug}/${level}/t${i}`;
export const sutKey = (slug: string, level: number, i: number) => `${slug}/${level}/s${i}`;

/** A level is complete when every task and every "Trys sutarimai" item is ticked. */
export function isLevelComplete(checked: Checked, slug: string, lvl: Level): boolean {
  const tasksDone = lvl.tasks.every((_, i) => checked[taskKey(slug, lvl.level, i)]);
  const sutDone = sutarimai.every((_, i) => checked[sutKey(slug, lvl.level, i)]);
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
  lvl.tasks.forEach((_, i) => checked[taskKey(slug, lvl.level, i)] && done++);
  sutarimai.forEach((_, i) => checked[sutKey(slug, lvl.level, i)] && done++);
  return [done, total];
}
