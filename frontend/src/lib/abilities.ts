import raw from "../data/abilities.json";
import type { Progress } from "./api";

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

export const sutarimai: Task[] = raw.sutarimai;
export const abilities: Ability[] = raw.abilities as Ability[];

export const getAbility = (slug: string): Ability | undefined =>
  abilities.find((a) => a.slug === slug);

export const taskKey = (slug: string, level: number, taskId: string) =>
  `${slug}/${level}/${taskId}`;

/** Every progress key in a level (tasks + the three "sutarimai"). */
export const levelKeys = (slug: string, lvl: Level): string[] => [
  ...lvl.tasks.map((t) => taskKey(slug, lvl.level, t.id)),
  ...sutarimai.map((s) => taskKey(slug, lvl.level, s.id)),
];

// Only lead-confirmed items ("done") count towards levels. A member's own ticks
// sit at "pending" until a lead confirms them.
const isDone = (p: Progress, key: string) => p[key] === "done";

/** A level is "filled" when every task and every "Trys sutarimai" item is confirmed. */
export function isLevelFilled(progress: Progress, slug: string, lvl: Level): boolean {
  return levelKeys(slug, lvl).every((k) => isDone(progress, k));
}

/**
 * A level counts as achieved only when it is filled *and* every lower level is too.
 * Progress is strictly sequential — ticking everything in a higher level earns nothing
 * until the earlier levels are done.
 */
export function isLevelAchieved(progress: Progress, a: Ability, lvl: Level): boolean {
  return a.levels.every((l) => l.level > lvl.level || isLevelFilled(progress, a.slug, l));
}

/** The unbroken run of filled levels from the lowest upward (where the credit stops). */
function achievedLevels(progress: Progress, a: Ability): Level[] {
  const ordered = [...a.levels].sort((x, y) => x.level - y.level);
  const run: Level[] = [];
  for (const lvl of ordered) {
    if (!isLevelFilled(progress, a.slug, lvl)) break;
    run.push(lvl);
  }
  return run;
}

/** Highest achieved level number (0 if none) — the top of the unbroken run from level 1. */
export function highestLevel(progress: Progress, a: Ability): number {
  const run = achievedLevels(progress, a);
  return run.length ? run[run.length - 1].level : 0;
}

/** How many levels are achieved — the length of the unbroken run from level 1. */
export function completedCount(progress: Progress, a: Ability): number {
  return achievedLevels(progress, a).length;
}

/** [confirmed, pending, total] items in a level (tasks + sutarimai). */
export function levelProgress(
  progress: Progress,
  slug: string,
  lvl: Level,
): [number, number, number] {
  const keys = levelKeys(slug, lvl);
  let done = 0;
  let pending = 0;
  for (const k of keys) {
    if (progress[k] === "done") done++;
    else if (progress[k] === "pending") pending++;
  }
  return [done, pending, keys.length];
}

/** Keys awaiting a lead's confirmation (optionally within one ability). */
export function pendingKeys(progress: Progress, slug?: string): string[] {
  return Object.keys(progress).filter(
    (k) => progress[k] === "pending" && (!slug || k.startsWith(`${slug}/`)),
  );
}

/** Keys awaiting confirmation inside one level. */
export const pendingInLevel = (progress: Progress, slug: string, lvl: Level) =>
  levelKeys(slug, lvl).filter((k) => progress[k] === "pending");
