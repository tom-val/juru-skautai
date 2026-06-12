// Member ID generation: firstname + lastname + "-" + 4 random alphanumerics.
// e.g. "Jonas", "Jonaitis" -> "jonasjonaitis-7g2k".

// Map common Lithuanian diacritics to ASCII so IDs stay URL-safe and typeable.
const LT_MAP: Record<string, string> = {
  ą: "a", č: "c", ę: "e", ė: "e", į: "i", š: "s", ų: "u", ū: "u", ž: "z",
};

/** Lowercase, strip Lithuanian diacritics, drop anything that is not a-z0-9. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[ąčęėįšųūž]/g, (c) => LT_MAP[c] ?? c)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/** 4 random alphanumerics from a CSPRNG. */
export function randomSuffix(length = 4): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

/** Build a candidate member ID. Caller persists with a uniqueness check and retries. */
export function buildMemberId(firstName: string, lastName: string): string {
  const base = slugify(firstName) + slugify(lastName);
  return `${base || "narys"}-${randomSuffix()}`;
}
