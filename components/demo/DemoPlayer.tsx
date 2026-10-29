"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// A "watch how it works" player: a pretend phone that plays through the app,
// with a finger that taps the next button and a caption explaining it.
// The demo is split into short chapters (e.g. "Start new Take 5") that people
// pick from. Nothing in the demo touches real data — every screen is a mock.

export type DemoScene = {
  title: string;
  text: string;
  // Which element (data-demo="...") the finger taps to move on. Leave out for
  // scenes that just show something.
  target?: string;
  // How long to linger before the finger moves (ms).
  wait?: number;
  render: () => React.ReactNode;
};

export type DemoChapter = {
  id: string;
  title: string;
  text: string;
  icon: React.ReactNode;
  scenes: DemoScene[];
};

const BRAND_GRADIENT = "linear-gradient(135deg, #10b981 0%, #047857 55%, #064e3b 100%)";

export default function DemoPlayer({
  label,
  chapters,
  storageKey,
  autoShow = true,
  variant = "light",
  className = "",
}: {
  label: string; // e.g. "Worker"
  chapters: DemoChapter[];
  storageKey: string;
  autoShow?: boolean;
  variant?: "light" | "plain";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [chapterId, setChapterId] = useState<string | null>(null); // null = the menu
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [finger, setFinger] = useState<{ x: number; y: number; show: boolean; tap: boolean }>({
    x: 140,
    y: 620,
    show: false,
    tap: false,
  });
  const screenRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

  // The pop-up is drawn at the top of the page, so it shows even when the
  // button sits inside a part of the page that's hidden on this screen size.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const chapter = chapters.find((c) => c.id === chapterId) ?? null;
  const scenes = chapter?.scenes ?? [];

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  // First visit on this device: open the menu once by itself.
  useEffect(() => {
    if (!autoShow) return;
    try {
      if (!localStorage.getItem(storageKey)) setOpen(true);
    } catch {}
  }, [autoShow, storageKey]);

  const close = () => {
    clearTimers();
    setOpen(false);
    setChapterId(null);
    try {
      localStorage.setItem(storageKey, "1");
    } catch {}
  };

  const go = useCallback(
    (n: number) => {
      clearTimers();
      setFinger((f) => ({ ...f, show: false, tap: false }));
      setI(Math.max(0, Math.min(n, Math.max(scenes.length - 1, 0))));
    },
    [scenes.length]
  );

  const startChapter = (id: string) => {
    clearTimers();
    setFinger((f) => ({ ...f, show: false, tap: false }));
    setI(0);
    setPlaying(true);
    setChapterId(id);
  };

  const backToMenu = () => {
    clearTimers();
    setFinger((f) => ({ ...f, show: false, tap: false }));
    setChapterId(null);
  };

  const scene = scenes[i];
  const last = i === scenes.length - 1;

  // Where is the thing the finger should tap?
  const targetPoint = () => {
    const root = screenRef.current;
    if (!root || !scene?.target) return null;
    const el = root.querySelector(`[data-demo="${scene.target}"]`) as HTMLElement | null;
    if (!el) return null;
    const r = root.getBoundingClientRect();
    const t = el.getBoundingClientRect();
    return { x: t.left - r.left + t.width / 2, y: t.top - r.top + t.height / 2 };
  };

  // Play each scene: pause, move the finger, tap, go on.
  useLayoutEffect(() => {
    if (!open || !scene) return;
    clearTimers();
    if (!playing) return;
    const wait = scene.wait ?? 2200;
    if (scene.target) {
      later(() => {
        const p = targetPoint();
        if (!p) return;
        setFinger({ x: p.x, y: p.y + 4, show: true, tap: false });
        later(() => setFinger((f) => ({ ...f, tap: true })), 800);
        later(() => {
          if (!last) go(i + 1);
        }, 1300);
      }, wait);
    } else if (!last) {
      later(() => go(i + 1), wait + 1500);
    }
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, i, playing, chapterId]);

  // Tapping the highlighted button yourself also moves on.
  const onScreenClick = (e: React.MouseEvent) => {
    if (!scene) return;
    const hit = (e.target as HTMLElement).closest("[data-demo]") as HTMLElement | null;
    if (hit && hit.dataset.demo === scene.target && !last) go(i + 1);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setChapterId(null);
          setOpen(true);
        }}
        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
          variant === "light"
            ? "bg-white/15 ring-1 ring-white/30 text-white hover:bg-white/25"
            : "bg-emerald-50 ring-1 ring-emerald-200 text-emerald-800 hover:bg-emerald-100"
        } ${className}`}
      >
        <span
          className={`w-4 h-4 rounded-full flex items-center justify-center ${
            variant === "light" ? "bg-white text-emerald-800" : "bg-emerald-700 text-white"
          }`}
        >
          <svg viewBox="0 0 24 24" className="w-2.5 h-2.5" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
        New here? Watch the demo
      </button>

      {open &&
        mounted &&
        createPortal(
        <div
          className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`${label} demo`}
        >
          <style>{`
            @keyframes demoIn { from { opacity: 0; transform: translateX(14px) } to { opacity: 1; transform: none } }
            @keyframes demoTap { 0% { transform: scale(.4); opacity: .7 } 100% { transform: scale(2.2); opacity: 0 } }
            @keyframes demoPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(16,185,129,.55) } 50% { box-shadow: 0 0 0 6px rgba(16,185,129,0) } }
            [data-demo-active="true"] { animation: demoPulse 1.4s ease-in-out infinite; border-radius: 12px; }
            .demo-phone { height: clamp(330px, calc(100dvh - 360px), 470px); }
            @media (min-width: 640px) { .demo-phone { height: clamp(380px, calc(100dvh - 170px), 540px); } }
          `}</style>

          <div className="w-full max-w-3xl max-h-full overflow-y-auto bg-white rounded-3xl shadow-2xl">
            {/* Top bar */}
            <div
              className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 text-white"
              style={{ background: BRAND_GRADIENT }}
            >
              <div className="min-w-0">
                <p className="text-sm font-extrabold tracking-wide leading-none">JSAFE demo</p>
                <p className="text-[11px] text-emerald-50/85 mt-0.5 truncate">
                  {label}
                  {chapter ? ` · ${chapter.title}` : " · how it works"}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {chapter && (
                  <button
                    type="button"
                    onClick={backToMenu}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/15 ring-1 ring-white/30 hover:bg-white/25"
                  >
                    All demos
                  </button>
                )}
                <button
                  type="button"
                  onClick={close}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/15 ring-1 ring-white/30 hover:bg-white/25"
                >
                  Close
                </button>
              </div>
            </div>

            {/* ---------- Menu: pick a demo ---------- */}
            {!chapter && (
              <div className="p-5 sm:p-8">
                <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900">What would you like to see?</h2>
                <p className="mt-1 text-sm text-neutral-600">
                  Pick a short demo. Each one plays by itself — pause, go back or skip ahead any time.
                </p>
                <div className="mt-5 grid gap-3">
                  {chapters.map((c, n) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => startChapter(c.id)}
                      className={`w-full flex items-center gap-3 rounded-2xl p-3.5 text-left transition-colors ${
                        n === 0
                          ? "bg-emerald-700 text-white hover:bg-emerald-800"
                          : "bg-white border border-neutral-200 shadow-sm hover:border-emerald-300"
                      }`}
                    >
                      <span
                        className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                          n === 0 ? "bg-white/15" : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {c.icon}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-bold">{c.title}</span>
                        <span className={`block text-sm ${n === 0 ? "text-emerald-50/85" : "text-neutral-500"}`}>
                          {c.text}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                          n === 0 ? "bg-white/15" : "bg-emerald-50 text-emerald-800"
                        }`}
                      >
                        <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        Play
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ---------- Player ---------- */}
            {chapter && scene && (
              <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-3 sm:gap-6 p-3 sm:p-6">
                {/* The pretend phone */}
                <div className="shrink-0 rounded-[2.2rem] bg-neutral-900 p-2 shadow-xl">
                  <div
                    ref={screenRef}
                    onClick={onScreenClick}
                    className="demo-phone relative w-[250px] sm:w-[260px] rounded-[1.7rem] overflow-hidden bg-neutral-50 select-none"
                  >
                    <div
                      key={`${chapter.id}-${i}`}
                      className="absolute inset-0 overflow-hidden"
                      style={{ animation: "demoIn .35s ease-out" }}
                      ref={(el) => {
                        // Make the target button gently pulse.
                        if (!el) return;
                        el.querySelectorAll("[data-demo]").forEach((n) =>
                          (n as HTMLElement).setAttribute(
                            "data-demo-active",
                            String((n as HTMLElement).dataset.demo === scene.target)
                          )
                        );
                      }}
                    >
                      {scene.render()}
                    </div>

                    {/* Finger */}
                    <div
                      className="pointer-events-none absolute z-20"
                      style={{
                        left: finger.x - 14,
                        top: finger.y - 4,
                        opacity: finger.show ? 1 : 0,
                        transition: "left .7s ease-in-out, top .7s ease-in-out, opacity .25s",
                      }}
                    >
                      {finger.tap && (
                        <span
                          className="absolute -left-1 -top-5 w-9 h-9 rounded-full bg-emerald-400/60"
                          style={{ animation: "demoTap .5s ease-out forwards" }}
                        />
                      )}
                      <svg
                        viewBox="0 0 24 24"
                        className="w-8 h-8 drop-shadow-lg"
                        fill="#fff"
                        stroke="#111"
                        strokeWidth="1.2"
                        strokeLinejoin="round"
                      >
                        <path d="M9 11V4.5a1.5 1.5 0 0 1 3 0V10l.5-.1a1.5 1.5 0 0 1 2.5 1.1v.3l.4-.1a1.5 1.5 0 0 1 2.1 1.4v.4a1.5 1.5 0 0 1 2 1.4V17a5 5 0 0 1-5 5h-2.2a5 5 0 0 1-4-2l-3-4a1.5 1.5 0 0 1 2.3-1.9L9 15z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Caption + controls */}
                <div className="flex-1 min-w-0 w-full flex flex-col">
                  <p className="text-xs font-semibold text-emerald-700">
                    {chapter.title} · {i + 1} of {scenes.length}
                  </p>
                  <h2 className="mt-1 text-xl sm:text-2xl font-extrabold text-neutral-900 leading-tight">
                    {scene.title}
                  </h2>
                  <p className="mt-1.5 text-sm sm:text-base text-neutral-600 leading-snug sm:leading-relaxed">
                    {scene.text}
                  </p>
                  {scene.target && !last && (
                    <p className="hidden sm:block mt-3 text-xs text-neutral-400">
                      Tip: tap the glowing button to move on yourself.
                    </p>
                  )}

                  <div className="mt-auto pt-3 sm:pt-5">
                    {/* Progress */}
                    <div className="flex gap-1">
                      {scenes.map((_, n) => (
                        <button
                          key={n}
                          type="button"
                          aria-label={`Go to step ${n + 1}`}
                          onClick={() => go(n)}
                          className={`h-1.5 flex-1 rounded-full ${n <= i ? "bg-emerald-600" : "bg-neutral-200"}`}
                        />
                      ))}
                    </div>
                    {last ? (
                      <div className="mt-3 sm:mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={backToMenu}
                          className="flex-1 py-2.5 rounded-xl border border-neutral-300 text-neutral-700 font-semibold"
                        >
                          Watch another
                        </button>
                        <button
                          type="button"
                          onClick={close}
                          className="flex-1 py-2.5 rounded-xl bg-emerald-700 text-white font-semibold hover:bg-emerald-800"
                        >
                          Done
                        </button>
                      </div>
                    ) : (
                      <div className="mt-3 sm:mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={() => go(i - 1)}
                          disabled={i === 0}
                          className="px-4 py-2.5 rounded-xl border border-neutral-300 text-neutral-700 font-semibold disabled:opacity-30"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={() => setPlaying((p) => !p)}
                          className="px-4 py-2.5 rounded-xl border border-neutral-300 text-neutral-700 font-semibold"
                        >
                          {playing ? "Pause" : "Play"}
                        </button>
                        <button
                          type="button"
                          onClick={() => go(i + 1)}
                          className="flex-1 py-2.5 rounded-xl bg-emerald-700 text-white font-semibold hover:bg-emerald-800"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>,
          document.body
        )}
    </>
  );
}
