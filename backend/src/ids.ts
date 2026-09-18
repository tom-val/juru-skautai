// ID generation: member IDs (firstname + "-" + 4 random alphanumerics, e.g.
// "Jonas" -> "jonas-7g2k"), group IDs and group invite codes.

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

/** Random alphanumerics from a CSPRNG. */
export function randomSuffix(length = 4): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

/** Build a candidate member ID. Caller persists with a uniqueness check and retries. */
export function buildMemberId(firstName: string): string {
  const base = slugify(firstName);
  return `${base || "narys"}-${randomSuffix()}`;
}

/** Opaque group ID (never user-facing beyond the URL). */
export const buildGroupId = () => `g-${randomSuffix(10)}`;

/**
 * Invite code a lead shares with a colleague ("xxxx-xxxx"). Only ever exchanged for
 * a membership by an authenticated lead, so 8 chars from a 36-symbol alphabet
 * (~2.8e12) is plenty behind the API's throttle.
 */
export const buildInviteCode = () => `${randomSuffix(4)}-${randomSuffix(4)}`;

const INVITE_RE = /^[a-z0-9]{4}-?[a-z0-9]{4}$/;

/** Normalise a typed/pasted invite code to its canonical "xxxx-xxxx" form, or null. */
export function parseInviteCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().toLowerCase();
  if (!INVITE_RE.test(cleaned)) return null;
  const flat = cleaned.replace("-", "");
  return `${flat.slice(0, 4)}-${flat.slice(4)}`;
}
