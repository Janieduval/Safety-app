"use client";

import { useEffect, useState } from "react";
import { openInstallGuide } from "@/components/InstallGuide";

// "Add to home screen" — replays the step-by-step guide for putting JSAFE on
// the phone's home screen. Hidden when JSAFE is already open from the home
// screen icon.
export default function AddToHomeScreenButton({ className = "" }: { className?: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
    setShow(!standalone);
  }, []);

  if (!show) return null;

  return (
    <button
      type="button"
      onClick={openInstallGuide}
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-white/15 ring-1 ring-white/30 text-white hover:bg-white/25 ${className}`}
    >
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <path d="M12 8v6M9 11h6" />
      </svg>
      Add to home screen
    </button>
  );
}
