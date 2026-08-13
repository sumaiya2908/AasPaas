/** Lightweight id generator matching Prisma cuid-ish strings (no extra dependency). */
export function createId() {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 11)}${Math.random().toString(36).slice(2, 7)}`;
}
