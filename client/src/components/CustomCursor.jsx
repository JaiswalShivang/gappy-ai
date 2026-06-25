/**
 * CustomCursor.jsx
 * Codex-style custom cursor:
 *  - Small filled square dot (tracks 1:1)
 *  - Larger hollow ring that lerps behind with RAF
 *  - Grows + changes color on hover over buttons/links/inputs
 *  - Hidden on touch devices
 */
import { useEffect, useRef, useState } from "react";

export default function CustomCursor() {
  const dotRef   = useRef(null);
  const ringRef  = useRef(null);
  const pos      = useRef({ x: -100, y: -100 });
  const ring     = useRef({ x: -100, y: -100 });
  const raf      = useRef(null);
  const [hidden, setHidden]   = useState(false);
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);

  useEffect(() => {
    // Hide on touch devices
    if (window.matchMedia("(hover: none)").matches) {
      setHidden(true);
      return;
    }

    const LERP = 0.12; // ring lag factor — lower = more lag

    function lerp(a, b, t) { return a + (b - a) * t; }

    function loop() {
      ring.current.x = lerp(ring.current.x, pos.current.x, LERP);
      ring.current.y = lerp(ring.current.y, pos.current.y, LERP);

      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px)`;
      }
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${ring.current.x}px, ${ring.current.y}px)`;
      }

      raf.current = requestAnimationFrame(loop);
    }

    raf.current = requestAnimationFrame(loop);

    function onMove(e) {
      pos.current.x = e.clientX;
      pos.current.y = e.clientY;
    }

    function onEnter(e) {
      const tag = e.target.tagName.toLowerCase();
      const role = e.target.getAttribute("role");
      if (
        tag === "a" || tag === "button" || tag === "label" ||
        tag === "input" || tag === "textarea" || tag === "select" ||
        role === "button" || e.target.closest("button") || e.target.closest("a")
      ) {
        setHovered(true);
      } else {
        setHovered(false);
      }
    }

    function onLeave() { setHovered(false); }

    function onMouseDown() { setClicked(true); }
    function onMouseUp()   { setClicked(false); }

    function onMouseLeaveWindow() { setHidden(true); }
    function onMouseEnterWindow() { setHidden(false); }

    document.addEventListener("mousemove",   onMove,   { passive: true });
    document.addEventListener("mouseover",   onEnter,  { passive: true });
    document.addEventListener("mouseout",    onLeave,  { passive: true });
    document.addEventListener("mousedown",   onMouseDown);
    document.addEventListener("mouseup",     onMouseUp);
    document.addEventListener("mouseleave",  onMouseLeaveWindow);
    document.addEventListener("mouseenter",  onMouseEnterWindow);

    return () => {
      cancelAnimationFrame(raf.current);
      document.removeEventListener("mousemove",   onMove);
      document.removeEventListener("mouseover",   onEnter);
      document.removeEventListener("mouseout",    onLeave);
      document.removeEventListener("mousedown",   onMouseDown);
      document.removeEventListener("mouseup",     onMouseUp);
      document.removeEventListener("mouseleave",  onMouseLeaveWindow);
      document.removeEventListener("mouseenter",  onMouseEnterWindow);
    };
  }, []);

  if (hidden) return null;

  const ACCENT = "#39FF88";

  return (
    <>
      {/* Small inner dot — tracks exactly */}
      <div
        ref={dotRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 99999,
          pointerEvents: "none",
          width:  hovered ? 6 : 4,
          height: hovered ? 6 : 4,
          marginLeft: hovered ? -3 : -2,
          marginTop:  hovered ? -3 : -2,
          background: hovered ? ACCENT : "#F5F5F5",
          borderRadius: 1,
          opacity: clicked ? 0.5 : 1,
          transition: "width 0.15s, height 0.15s, background 0.15s, opacity 0.1s, margin 0.15s",
          willChange: "transform",
        }}
      />

      {/* Outer ring — lags behind */}
      <div
        ref={ringRef}
        style={{
          position: "fixed",
          top:  0,
          left: 0,
          zIndex: 99998,
          pointerEvents: "none",
          width:  hovered ? 36 : 20,
          height: hovered ? 36 : 20,
          marginLeft: hovered ? -18 : -10,
          marginTop:  hovered ? -18 : -10,
          border: `1px solid ${hovered ? ACCENT : "rgba(245,245,245,0.25)"}`,
          borderRadius: 2,
          opacity: clicked ? 0.4 : hovered ? 0.9 : 0.5,
          transition: "width 0.2s, height 0.2s, border-color 0.2s, opacity 0.15s, margin 0.2s",
          willChange: "transform",
          backdropFilter: hovered ? "blur(1px)" : "none",
        }}
      />
    </>
  );
}
