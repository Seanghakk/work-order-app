// Shared validation for optional URL fields (e.g. documentControlUrl on
// WorkOrder / ServiceRequest). Used both client-side (inline form checks)
// and server-side (API route handlers) so the rule stays in one place.
export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
