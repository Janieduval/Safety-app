"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// Pull down from the top of the page to refresh, like a normal phone app.
// Only on the admin, supervisor and statistics pages, and only when JSAFE is
// opened from the home screen (in a browser tab the browser already does this).
// Never on the assessment pages, so a worker can't reload mid-form by accident.

const PAGES = ["/admin", "/supervisor", "/stats"];
const TRIGGER = 70; // how far (px) to pull before it refreshes
const MAX_PULL = 110;

function isHomeScreenApp(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

export default function PullToRefresh() {
  const pathname = usePathname() ?? "";
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const pullRef = useRef(0);

  const onThisPage = PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  useEffect(() => {
    if (!onThisPage || !isHomeScreenApp()) return;

    const setBoth = (n: number) => {
      pullRef.current = n;
      setPull(n);
    };

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || window.scrollY > 0) {
        startY.current = null;
        return;
      }
      startY.current = e.touches[0].clientY;
    };

    const onMove = (e: TouchEvent) => {
      if (startY.current === null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0 || window.scrollY > 0) {
        if (pullRef.current) setBoth(0);
        return;
      }
      // Stop the page bouncing while the pull circle is showing.
      if (e.cancelable) e.preventDefault();
      setBoth(Math.min(dy * 0.5, MAX_PULL));
    };

    const onEnd = () => {
      if (startY.current === null) return;
      startY.current = null;
      if (pullRef.current >= TRIGGER) {
        setRefreshing(true);
        setBoth(TRIGGER);
        window.location.reload();
      } else {
        setBoth(0);
      }
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [onThisPage]);

  if (!onThisPage || (pull === 0 && !refreshing)) return null;

  const ready = pull >= TRIGGER;

  return (
    <div
      className="fixed inset-x-0 z-50 flex justify-center pointer-events-none"
      style={{
        top: "env(safe-area-inset-top, 0px)",
        transform: `translateY(${pull - 44}px)`,
        transition: startY.current === null ? "transform 0.2s ease" : "none",
      }}
    >
      <div className="w-10 h-10 rounded-full bg-white shadow-lg ring-1 ring-black/5 flex items-center justify-center">
        <svg
          viewBox="0 0 24 24"
          className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`}
          fill="none"
          stroke={ready || refreshing ? "#047857" : "#a3a3a3"}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={refreshing ? undefined : { transform: `rotate(${(pull / TRIGGER) * 270}deg)` }}
        >
          <path d="M20 12a8 8 0 1 1-2.3-5.7" />
          <path d="M20 4v4.5h-4.5" />
        </svg>
      </div>
    </div>
  );
}
