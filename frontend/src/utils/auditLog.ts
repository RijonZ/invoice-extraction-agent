export function formatMetadata(metadata: Record<string, unknown>): string {
  const entries = Object.entries(metadata).filter(([, v]) => v !== undefined && v !== null);
  if (entries.length === 0) return "";
  return entries.map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`).join(" · ");
}

export function formatAction(action: string): string {
  return action.replace(/\./g, " ");
}

export function actionBadgeClass(action: string): string {
  if (action.includes("correct") || action.includes("update")) return "status-badge status-processing";
  if (action.includes("merge") || action.includes("delete")) return "status-badge status-error";
  if (action.includes("create") || action.includes("register")) return "status-badge status-approved";
  return "status-badge status-needs_review";
}
