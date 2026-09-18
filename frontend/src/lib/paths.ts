// Single place that knows the route shapes; every link/navigation uses these.
export const memberPath = (memberId: string, slug?: string) =>
  `/narys/${encodeURIComponent(memberId)}${slug ? `/${slug}` : ""}`;

/** Absolute, shareable link to a member's tracker (for the lead's copy button). */
export const memberUrl = (memberId: string) =>
  `${window.location.origin}${memberPath(memberId)}`;

export const dashboardPath = "/vadovas/skydelis";

export const groupPath = (groupId: string) => `/vadovas/grupe/${encodeURIComponent(groupId)}`;

/** A lead's review view of one member (optionally one ability). */
export const leadMemberPath = (groupId: string, memberId: string, slug?: string) =>
  `${groupPath(groupId)}/narys/${encodeURIComponent(memberId)}${slug ? `/${slug}` : ""}`;

export const invitePath = (code: string) => `/vadovas/kvietimas/${encodeURIComponent(code)}`;

/** Absolute invite link a lead shares with a colleague. */
export const inviteUrl = (code: string) => `${window.location.origin}${invitePath(code)}`;
