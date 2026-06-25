/**
 * components/AudioPlayer.jsx — Fixed-bottom audio proof player
 *
 * Usage: <AudioPlayer task={task} onClose={() => setTask(null)} />
 *
 * Renders nothing when task is null.
 * task shape: { title, audioClipPath, startTime, endTime }
 *
 * Backend serves audio clips at:
 *   /uploads/audio_proofs/<file>          (FFmpeg cut clip — best)
 *   /uploads/audio/<file>#t=start,end    (Media Fragment fallback — works in all modern browsers)
 * Vite proxies /uploads → http://localhost:8000
 */
import { useRef, useEffect, useState } from "react";
import { fmtTime } from "../lib/format";
import { BACKEND_URL } from "../lib/api";

/**
 * Parse a media-fragment URL into { baseSrc, startSec, endSec }.
 * For cut clips (no fragment) returns { baseSrc: src, startSec: null, endSec: null }.
 */
function parseAudioSrc(audioClipPath) {
  if (!audioClipPath) return { baseSrc: null, startSec: null, endSec: null };
  const hashIdx = audioClipPath.indexOf("#t=");
  if (hashIdx === -1) return { baseSrc: audioClipPath, startSec: null, endSec: null };
  const baseSrc = audioClipPath.slice(0, hashIdx);
  const fragment = audioClipPath.slice(hashIdx + 3); // "start,end"
  const [s, e] = fragment.split(",").map(Number);
  return { baseSrc, startSec: isNaN(s) ? null : s, endSec: isNaN(e) ? null : e };
}

export default function AudioPlayer({ task, onClose }) {
  const audioRef = useRef(null);
  const [status, setStatus] = useState("loading"); // loading | ready | error

  const { baseSrc, startSec, endSec } = parseAudioSrc(task?.audioClipPath);

  // Reload audio whenever the task changes
  useEffect(() => {
    setStatus("loading");
    const el = audioRef.current;
    if (!el || !baseSrc) return;

    el.load();

    // For media-fragment URLs: seek to startSec once metadata loads
    if (startSec !== null) {
      const onMeta = () => {
        el.currentTime = startSec;
        el.play().catch(() => {}); // autoplay may be blocked — that's fine
      };
      el.addEventListener("loadedmetadata", onMeta, { once: true });
      return () => el.removeEventListener("loadedmetadata", onMeta);
    }
  }, [task?._id, baseSrc]); // re-run for every new task

  // Stop playback at endSec for media-fragment URLs
  useEffect(() => {
    const el = audioRef.current;
    if (!el || endSec === null) return;

    const onTimeUpdate = () => {
      if (el.currentTime >= endSec) {
        el.pause();
      }
    };
    el.addEventListener("timeupdate", onTimeUpdate);
    return () => el.removeEventListener("timeupdate", onTimeUpdate);
  }, [endSec]);

  if (!task) return null;

  const hasAudio = Boolean(baseSrc);
  // Use the full fragment URL as src so the browser also uses it as a hint
  const audioSrc = baseSrc && baseSrc.startsWith("/") ? `${BACKEND_URL}${baseSrc}` : baseSrc;

  return (
    <div
      role="dialog"
      aria-label="Audio proof player"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[150] bg-[#111111] border border-[#39FF88]/40 rounded-sm shadow-2xl animate-fade-in-up"
      style={{ minWidth: 380, maxWidth: "calc(100vw - 48px)" }}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#262626]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-1.5 h-1.5 rounded-sm bg-[#39FF88] shrink-0 animate-pulse" />
          <p className="text-[9px] font-mono text-[#39FF88] uppercase tracking-widest shrink-0">// audio proof</p>
          <span className="text-[#262626] mx-1">·</span>
          <p className="text-[10px] font-mono text-[#888888] truncate">{task.title}</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close audio player"
          className="text-[#555555] hover:text-[#FF5C5C] transition-colors ml-4 text-xs font-mono shrink-0"
        >
          ✕
        </button>
      </div>

      {/* Player body */}
      <div className="px-4 py-3">
        {/* Timestamp range */}
        <p className="text-[9px] font-mono text-[#555555] mb-2">
          [{fmtTime(task.startTime)} – {fmtTime(task.endTime)}]
          {startSec !== null && <span className="text-[#39FF88]/60"> · seeked to timestamp</span>}
          {startSec === null && hasAudio && <span> · cut clip</span>}
        </p>

        {!hasAudio ? (
          <p className="text-[10px] font-mono text-[#FF5C5C]">
            // audio clip not available for this task
          </p>
        ) : status === "error" ? (
          <p className="text-[10px] font-mono text-[#FF5C5C]">
            // failed to load audio — check server is running
          </p>
        ) : (
          <audio
            ref={audioRef}
            src={audioSrc}
            controls
            onCanPlay={() => setStatus("ready")}
            onError={() => setStatus("error")}
            style={{ width: "100%", height: 32, accentColor: "#39FF88" }}
            className="rounded-sm"
          />
        )}
      </div>
    </div>
  );
}
