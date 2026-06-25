/**
 * lib/format.js — Pure formatting helpers + color utilities
 * No React imports. Fully tree-shakeable.
 */

// ─── Date / time ──────────────────────────────────────────────────────────────

/** Extract a JS Date from a MongoDB ObjectId hex string (first 4 bytes = unix timestamp). */
export function dateFromObjectId(id) {
  if (!id || typeof id !== "string" || id.length < 8) return null;
  try {
    return new Date(parseInt(id.substring(0, 8), 16) * 1000);
  } catch {
    return null;
  }
}

export function fmtDate(value) {
  let d;
  if (value && typeof value === "string" && /^[a-f0-9]{24}$/i.test(value)) {
    d = dateFromObjectId(value);
  } else {
    d = new Date(value);
  }
  if (!d || isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function fmtDur(secs) {
  if (!secs && secs !== 0) return null;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m === 0) return `${s}s`;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export function fmtTime(secs) {
  if (secs == null) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "good morning";
  if (h < 17) return "good afternoon";
  return "good evening";
}

// ─── Color palette for assignees ──────────────────────────────────────────────
const PALETTE = ["#39FF88", "#FFB800", "#FF5C5C", "#60CFFF", "#CF60FF", "#FF8C60", "#60FFD0", "#FFD060"];

/** Deterministic color from a string (stable across renders via hash). */
export function assigneeColor(name) {
  if (!name || name === "Unassigned") return "#555555";
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}
