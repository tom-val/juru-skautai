// Typed client for the tracker API. Lead calls attach the Cognito ID token.
import { config } from "../config";
import { getIdToken } from "../auth/cognito";

/** "pending" = the member ticked it, awaiting a lead; "done" = a lead confirmed it. */
export type ProgressState = "done" | "pending";
export type Progress = Record<string, ProgressState>;

export type LeadRole = "owner" | "lead";

/** A group as listed on the lead's dashboard. */
export interface GroupSummary {
  groupId: string;
  name: string;
  tuntas: string;
  role: LeadRole;
  inviteCode: string;
  createdAt: string;
  memberCount: number;
  pendingCount: number;
}

export interface GroupLead {
  leadSub: string;
  email: string;
  name: string;
  role: LeadRole;
  joinedAt: string;
}

/** A member as seen by a lead of their group. */
export interface Member {
  memberId: string;
  firstName: string;
  tuntas: string;
  groupId: string;
  progress: Progress;
  createdAt: string;
  updatedAt: string;
}

export interface GroupDetail {
  group: Omit<GroupSummary, "memberCount" | "pendingCount">;
  leads: GroupLead[];
  members: Member[];
}

/** Public member profile (member-facing tracker). */
export interface MemberProfile {
  memberId: string;
  firstName: string;
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

const enc = encodeURIComponent;
const groupPath = (groupId: string) => `/groups/${enc(groupId)}`;
const groupMemberPath = (groupId: string, memberId: string) =>
  `${groupPath(groupId)}/members/${enc(memberId)}`;

// --- Groups (team lead) ---
export const listGroups = () =>
  request<{ groups: GroupSummary[] }>("GET", "/groups", { auth: true }).then((r) => r.groups);

export const createGroup = (name: string) =>
  request<GroupSummary>("POST", "/groups", { auth: true, body: { name } });

export const joinGroup = (code: string) =>
  request<Omit<GroupSummary, "memberCount" | "pendingCount">>("POST", "/groups/join", {
    auth: true,
    body: { code },
  });

export const getGroup = (groupId: string) =>
  request<GroupDetail>("GET", groupPath(groupId), { auth: true });

export const renameGroup = (groupId: string, name: string) =>
  request<{ ok: true }>("PATCH", groupPath(groupId), { auth: true, body: { name } });

export const deleteGroup = (groupId: string) =>
  request<{ ok: true; membersRemoved: number }>("DELETE", groupPath(groupId), { auth: true });

export const rotateInviteCode = (groupId: string) =>
  request<{ inviteCode: string }>("POST", `${groupPath(groupId)}/invite`, { auth: true }).then(
    (r) => r.inviteCode,
  );

export const removeLead = (groupId: string, leadSub: string) =>
  request<{ ok: true }>("DELETE", `${groupPath(groupId)}/leads/${enc(leadSub)}`, { auth: true });

// --- Members (team lead) ---
export const createMember = (groupId: string, firstName: string) =>
  request<Member>("POST", `${groupPath(groupId)}/members`, { auth: true, body: { firstName } });

export const getGroupMember = (groupId: string, memberId: string) =>
  request<Member & { groupName: string }>("GET", groupMemberPath(groupId, memberId), {
    auth: true,
  });

export const deleteMember = (groupId: string, memberId: string) =>
  request<{ ok: true }>("DELETE", groupMemberPath(groupId, memberId), { auth: true });

/** Lead review: true confirms an item ("done"), false removes it (rejects / reverts). */
export const saveLeadProgressUpdates = (
  groupId: string,
  memberId: string,
  updates: Record<string, boolean>,
) =>
  request<{ ok: true }>("PUT", `${groupMemberPath(groupId, memberId)}/progress`, {
    auth: true,
    body: { updates },
    keepalive: true,
  });

// --- Member (open, ID is the credential) ---
export const getMember = (memberId: string) =>
  request<MemberProfile>("GET", `/members/${enc(memberId)}`);

/**
 * Member claims: true marks an item "pending" (a lead must confirm it), false
 * retracts a pending claim. Confirmed items are left untouched by the server.
 * keepalive lets the final flush survive page unload.
 */
export const saveProgressUpdates = (memberId: string, updates: Record<string, boolean>) =>
  request<{ ok: true; progress: Progress }>("PUT", `/members/${enc(memberId)}/progress`, {
    body: { updates },
    keepalive: true,
  });
