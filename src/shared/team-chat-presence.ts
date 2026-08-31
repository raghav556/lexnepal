/**
 * Lightweight presence for Team Chat (TC-6).
 * Polling-based: peers with DM/message activity in the last 15 minutes are "recent".
 * Full SSE/WebSocket can replace this later without changing the UI contract.
 */
export function presenceLabel(
  lastActivityIso: string | null | undefined,
  now = Date.now(),
): string {
  if (!lastActivityIso) return "Offline";
  const ts = new Date(lastActivityIso).getTime();
  if (Number.isNaN(ts)) return "Offline";
  const delta = now - ts;
  if (delta < 2 * 60_000) return "Active now";
  if (delta < 15 * 60_000) return "Active recently";
  return "Away";
}
