import { useCallback, useEffect, useRef, useState } from "react";
import {
  getMember,
  saveProgressUpdates,
  type MemberProfile,
  type Progress,
} from "../lib/api";

export type MemberStatus = "loading" | "ready" | "notfound" | "error";

const SAVE_DELAY = 600; // debounce writes while ticking through a level

/**
 * Loads a member's profile + progress from the API and persists ticks back as
 * per-key deltas (optimistic local update, debounced PUT). Pending changes are
 * flushed on unmount and on pagehide (keepalive fetch) so a quick navigation or
 * tab close cannot drop the last batch; failed flushes are kept for retry and
 * surfaced via `saveFailed`.
 */
export function useMemberProgress(memberId: string) {
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [checked, setChecked] = useState<Progress>({});
  const [saveFailed, setSaveFailed] = useState(false);
  // `loadedId` lets us derive "loading" during render (no synchronous setState in
  // the effect): until the fetch for the current memberId resolves, status is loading.
  const [loadedId, setLoadedId] = useState("");
  const [loadStatus, setLoadStatus] = useState<Exclude<MemberStatus, "loading">>("ready");

  // Single source of truth for the current map (toggle computes from it) and the
  // not-yet-saved delta (key → desired value) since the last successful flush.
  const current = useRef<Progress>({});
  const pending = useRef<Record<string, boolean>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const batch = pending.current;
    if (Object.keys(batch).length === 0) return;
    pending.current = {};
    saveProgressUpdates(memberId, batch)
      .then(() => setSaveFailed(false))
      .catch(() => {
        // Keep the failed delta for retry; later toggles take precedence.
        pending.current = { ...batch, ...pending.current };
        setSaveFailed(true);
      });
  }, [memberId]);

  useEffect(() => {
    let active = true;
    getMember(memberId)
      .then((m) => {
        if (!active) return;
        current.current = m.progress ?? {};
        pending.current = {};
        setMember(m);
        setChecked(current.current);
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
  }, [memberId, flush]);

  // Tab close / bfcache navigation: keepalive fetch lets the request outlive the page.
  useEffect(() => {
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [flush]);

  const toggle = useCallback(
    (key: string) => {
      const next = { ...current.current };
      const ticked = !next[key];
      if (ticked) next[key] = true;
      else delete next[key];
      current.current = next;
      pending.current[key] = ticked;
      setChecked(next);

      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, SAVE_DELAY);
    },
    [flush],
  );

  const status: MemberStatus = loadedId === memberId ? loadStatus : "loading";

  return { member, checked, toggle, status, saveFailed };
}
