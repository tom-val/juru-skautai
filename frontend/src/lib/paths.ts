// Single place that knows the member-route shape; every link/navigation uses these.
export const memberPath = (memberId: string, slug?: string) =>
  `/narys/${encodeURIComponent(memberId)}${slug ? `/${slug}` : ""}`;

/** Absolute, shareable link to a member's tracker (for the lead's copy button). */
export const memberUrl = (memberId: string) =>
  `${window.location.origin}${memberPath(memberId)}`;
