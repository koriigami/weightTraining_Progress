// Who may see Insights. The owner is named by the OWNER_EMAIL env var, which is
// never sent to a browser: the session only carries the yes or no.

export function isOwnerEmail(email: string | null | undefined, owner: string | undefined = process.env.OWNER_EMAIL): boolean {
  const o = owner?.trim().toLowerCase();
  return Boolean(o && email && email.trim().toLowerCase() === o);
}

// The status /api/insights answers with. Anyone who is not the owner, signed in
// or not, gets 404 so the route looks like it does not exist.
export function insightsStatus(email: string | null | undefined, owner?: string): 200 | 404 {
  return isOwnerEmail(email, owner) ? 200 : 404;
}
