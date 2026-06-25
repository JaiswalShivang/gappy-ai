/**
 * lib/constants.js — Shared domain constants
 */

// Task kanban columns (ordered)
export const TASK_COLUMNS = ["To Do", "In Progress", "In Review", "Done"];

// Task status → display config
export const TASK_STATUS = {
  "To Do":       { color: "#555555", label: "[todo]",   dot: "#555555" },
  "In Progress": { color: "#39FF88", label: "[wip]",    dot: "#39FF88" },
  "In Review":   { color: "#FFB800", label: "[review]", dot: "#FFB800" },
  "Done":        { color: "#39FF88", label: "[done]",   dot: "#39FF88" },
};

// Meeting status → display config
export const MEETING_STATUS = {
  "Action Items Generated": { color: "#39FF88", label: "[done]" },
  "Processing AI":          { color: "#FFB800", label: "[processing]" },
  "Failed":                 { color: "#FF5C5C", label: "[error]" },
  "Uploaded":               { color: "#888888", label: "[uploaded]" },
};

// Task priority → display config
export const PRIORITY = {
  High:   { color: "#FF5C5C", bg: "#FF5C5C18", border: "#FF5C5C30" },
  Medium: { color: "#FFB800", bg: "#FFB80018", border: "#FFB80030" },
  Low:    { color: "#888888", bg: "#88888818", border: "#88888830" },
};
