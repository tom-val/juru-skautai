// Typed client for the members API. Admin calls attach the Cognito ID token.
import { config } from "../config";
import { getIdToken } from "../auth/cognito";

export type Progress = Record<string, boolean>;

/** A member as seen by their team lead (admin list/create). */
export interface Member {
  memberId: string;
  firstName: string;
  lastName: string;
  tuntas: string;
  progress: Progress;
  createdAt: string;
  updatedAt: string;
}

/** Public member profile (member-facing tracker). */
export interface MemberProfile {
  memberId: string;
  firstName: string;
  lastName: string;
  tuntas: string;
  progress: Progress;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(
  method: string,
  path: string,
  opts: { body?: unknown; auth?: boolean; keepalive?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";

  if (opts.auth) {
    const token = await getIdToken();
    if (!token) throw new ApiError(401, "Not signed in");
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${config.apiUrl}${path}`, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    keepalive: opts.keepalive,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.message) message = data.message;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as T;
}

// --- Admin (team lead) ---
export const listMembers = () =>
  request<{ members: Member[] }>("GET", "/members", { auth: true }).then(
    (r) => r.members,
  );

export const createMember = (firstName: string, lastName: string) =>
  request<Member>("POST", "/members", {
    auth: true,
    body: { firstName, lastName },
  });

export const deleteMember = (memberId: string) =>
  request<{ ok: true }>("DELETE", `/members/${encodeURIComponent(memberId)}`, {
    auth: true,
  });

// --- Member (open, ID is the credential) ---
export const getMember = (memberId: string) =>
  request<MemberProfile>("GET", `/members/${encodeURIComponent(memberId)}`);

/**
 * Send per-key progress changes (true = ticked, false = unticked). keepalive lets
 * the final flush survive page unload.
 */
export const saveProgressUpdates = (
  memberId: string,
  updates: Record<string, boolean>,
) =>
  request<{ ok: true }>(
    "PUT",
    `/members/${encodeURIComponent(memberId)}/progress`,
    { body: { updates }, keepalive: true },
  );
