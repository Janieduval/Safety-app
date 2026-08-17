"use client";
import { useEffect, useState } from "react";
import Script from "next/script";
import DebugErrorOverlay from "./DebugErrorOverlay";

const STORAGE_KEY = "dtsa_debug_enabled";

// Debug tools (the eruda mobile console + the on-screen error overlay) are
// hidden from everyone by default. Visiting the app once with ?debug=1 on
// the end of the URL turns them on for that browser going forward;
// ?debug=0 turns them back off. No visible trigger otherwise.
export default function DebugToolsLoader() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("debug") === "1") {
        localStorage.setItem(STORAGE_KEY, "1");
      } else if (params.get("debug") === "0") {
        localStorage.removeItem(STORAGE_KEY);
      }
      setEnabled(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // localStorage unavailable (e.g. private browsing) — stays hidden
    }
  }, []);

  if (!enabled) return null;

  return (
    <>
      <Script
        src="/eruda.js"
        strategy="afterInteractive"
        onLoad={() => {
          // @ts-ignore
          if (window.eruda) window.eruda.init();
        }}
      />
      <DebugErrorOverlay />
    </>
  );
}
