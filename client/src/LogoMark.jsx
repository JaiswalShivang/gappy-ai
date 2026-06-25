/**
 * LogoMark.jsx — Minutes AI Meeting Summarizer
 *
 * Usage:
 *   <LogoMark size={24} />                — icon only
 *   <LogoMark size={32} withWordmark />   — icon + "MINUTES" text
 *   <LogoMark size={24} animate />        — animated draw-in checkmark (loading state)
 *
 * Geometry (24×24 viewBox):
 *   Circle: cx=12 cy=14.5 r=8.8  → extends y≈5.7 to y≈23.3
 *   Crown (two #888 horizontal lines): y=2 (top) and y=4 (lower)
 *   Checkmark polyline: M8,14.5 L10.8,17.4 L17,10.5
 *   Checkmark path length ≈ 13.5 → dasharray="14"
 */

import { useId } from "react";

// ── Core SVG paths / geometry ─────────────────────────────────────────────────
const CX = 12;
const CY = 14.5;
const R  = 8.8;

// Crown: two short horizontal lines at the very top, #888888
const CROWN = [
  { x1: 9.8,  y1: 2,   x2: 14.2, y2: 2   }, // top button line
  { x1: 10.4, y1: 3.8, x2: 13.6, y2: 3.8 }, // lower stem line
];

// Checkmark: short leg then long diagonal
// Verified all points inside circle r=8.8 centered at (12, 14.5)
const CHECK_D = "M 8 14.5 L 10.8 17.4 L 17 10.5";
const CHECK_LENGTH = 13.5; // approximate stroke length for dash animation

// ── Stopwatch icon SVG ────────────────────────────────────────────────────────
function StopwatchIcon({ size, animate, loop, animId }) {
  const dashStyle = animate || loop
    ? {
        strokeDasharray: CHECK_LENGTH,
        strokeDashoffset: CHECK_LENGTH,
        animation: loop
          ? `minutes-draw-check-loop 2s ease-in-out infinite`
          : `minutes-draw-check 0.6s ease-out forwards`,
      }
    : {};

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Minutes logo"
      role="img"
      style={{ display: "block", flexShrink: 0 }}
    >
      {/* ── Crown / button (two horizontal lines) ── */}
      {CROWN.map((c, i) => (
        <line
          key={i}
          x1={c.x1} y1={c.y1}
          x2={c.x2} y2={c.y2}
          stroke="#888888"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      ))}

      {/* ── Short vertical stem connecting crown to circle ── */}
      <line
        x1={CX} y1={3.8}
        x2={CX} y2={CY - R + 0.4}
        stroke="#888888"
        strokeWidth="1.4"
        strokeLinecap="round"
      />

      {/* ── Main stopwatch circle ── */}
      <circle
        cx={CX}
        cy={CY}
        r={R}
        stroke="#39FF88"
        strokeWidth="2"
        fill="none"
      />

      {/* ── Checkmark ── */}
      <path
        d={CHECK_D}
        stroke="#39FF88"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        style={dashStyle}
      />
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function LogoMark({ size = 24, withWordmark = false, animate = false, loop = false }) {
  const id = useId();
  const wordmarkSize = Math.round(size * 0.54);

  const icon = <StopwatchIcon size={size} animate={animate} loop={loop} animId={id} />;

  if (!withWordmark) return icon;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: Math.round(size * 0.45),
        lineHeight: 1,
      }}
    >
      {icon}
      <span
        style={{
          fontFamily: '"JetBrains Mono", "Geist Mono", "IBM Plex Mono", monospace',
          fontWeight: 700,
          fontSize: wordmarkSize,
          letterSpacing: "0.13em",
          color: "#F5F5F5",
          textTransform: "uppercase",
          lineHeight: 1,
          userSelect: "none",
        }}
      >
        MINUTES
      </span>
    </span>
  );
}

// ── Animated processing indicator ─────────────────────────────────────────────
/**
 * <LogoMarkProcessing label="AI is summarizing..." />
 * Shows the logo with the checkmark drawing itself on repeat,
 * used as the "processing" state in the dashboard upload panel.
 */
export function LogoMarkProcessing({ size = 28, label = "AI is summarizing..." }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 12,
        color: "#888888",
      }}
    >
      <LogoMark size={size} loop />
      {label && <span style={{ color: "#888888" }}>{label}</span>}
    </span>
  );
}
