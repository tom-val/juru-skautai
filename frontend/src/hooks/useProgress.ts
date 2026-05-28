import { useCallback, useState } from "react";

const STORAGE_KEY = "ls-laukiniai-progress";
type Checked = Record<string, boolean>;

function load(): Checked {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") as Checked;
  } catch {
    return {};
  }
}

export function useProgress() {
  const [checked, setChecked] = useState<Checked>(load);

  const toggle = useCallback((key: string) => {
    setChecked((prev) => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = true;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { checked, toggle };
}
