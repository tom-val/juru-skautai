import { useCallback, useEffect, useRef, useState } from "react";
import {
  getGroupMember,
  getMember,
  saveLeadProgressUpdates,
  saveProgressUpdates,
  type MemberProfile,
  type Progress,
} from "../lib/api";

export type MemberStatus = "loading" | "ready" | "notfound" | "error";

/**
 * Who is editing:
 *   member — the scout: ticks become "pending" claims; confirmed items are locked
 *   lead   — a group lead: ticks confirm ("done"), unticks remove (reject / revert)
 */
export type EditMode = { kind: "member" } | { kind: "lead"; groupId: string };

const SAVE_DELAY = 600; // debounce writes while ticking through a level
const BATCH_LIMIT = 100; // server-side MAX_UPDATES per request

/**
 * Loads a member's profile + progress and persists ticks back as per-key deltas
 * (optimistic local update, debounced PUT). Pending changes are flushed on unmount
 * and on pagehide (keepalive fetch) so a quick navigation or tab close cannot drop
 * the last batch; failed flushes are kept for retry and surfaced via `saveFailed`.
 */
export function useProgress(memberId: string, mode: EditMode) {
  const groupId = mode.kind === "lead" ? mode.groupId : "";
  const [member, setMember] = useState<(MemberProfile & { groupName?: string }) | null>(null);
  const [progress, setProgress] = useState<Progress>({});
  const [saveFailed, setSaveFailed] = useState(false);
  // `loadedId` lets us derive "loading" during render (no synchronous setState in
  // the effect): until the fetch for the current memberId resolves, status is loading.
  const [loadedId, setLoadedId] = useState("");
  const [loadStatus, setLoadStatus] = useState<Exclude<MemberStatus, "loading">>("ready");

  // Single source of truth for the current map (set() computes from it) and the
  // not-yet-saved delta (key → desired value) since the last successful flush.
  const current = useRef<Progress>({});
  const pending = useRef<Record<string, boolean>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const entries = Object.entries(pending.current);
    if (entries.length === 0) return;
    pending.current = {};

    for (let i = 0; i < entries.length; i += BATCH_LIMIT) {
      const batch = Object.fromEntries(entries.slice(i, i + BATCH_LIMIT));
      const save = groupId
        ? saveLeadProgressUpdates(groupId, memberId, batch)
        : saveProgressUpdates(memberId, batch);
      save
        .then(() => setSaveFailed(false))
        .catch(() => {
          // Keep the failed delta for retry; later toggles take precedence.
          pending.current = { ...batch, ...pending.current };
          setSaveFailed(true);
        });
    }
  }, [memberId, groupId]);

  useEffect(() => {
    let active = true;
    const load = groupId ? getGroupMember(groupId, memberId) : getMember(memberId);
    load
      .then((m) => {
        if (!active) return;
        current.current = m.progress ?? {};
        pending.current = {};
        setMember(m);
        setProgress(current.current);
        setLoadStatus("ready");
        setLoadedId(memberId);
      })
      .catch((err) => {
        if (!active) return;
        setLoadStatus(err?.status === 404 ? "notfound" : "error");
        setLoadedId(memberId);
      });
    return () => {
      active = false;
      flush(); // don't drop the last debounced batch on unmount/member change
    };
  }, [memberId, groupId, flush]);

  // Tab close / bfcache navigation: keepalive fetch lets the request outlive the page.
  useEffect(() => {
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [flush]);

  /**
   * Tick (true) or untick (false) keys, mirroring the server's rules locally:
   * a member's tick → "pending" (never touches "done"); a lead's tick → "done".
   */
  const set = useCallback(
    (keys: string | string[], ticked: boolean) => {
      const next = { ...current.current };
      let changed = false;
      for (const key of Array.isArray(keys) ? keys : [keys]) {
        const state = next[key];
        if (mode.kind === "member") {
          if (ticked && state === undefined) next[key] = "pending";
          else if (!ticked && state === "pending") delete next[key];
          else continue;
        } else {
          if (ticked && state !== "done") next[key] = "done";
          else if (!ticked && state !== undefined) delete next[key];
          else continue;
        }
        pending.current[key] = ticked;
        changed = true;
      }
      if (!changed) return;
      current.current = next;
      setProgress(next);

      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, SAVE_DELAY);
    },
    [flush, mode.kind],
  );

  const status: MemberStatus = loadedId === memberId ? loadStatus : "loading";

  return { member, progress, set, status, saveFailed };
}
