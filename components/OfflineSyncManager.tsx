"use client";
import { useEffect } from "react";
import { syncPendingAssessments } from "@/lib/syncEngine";

// Mounted once in the root layout so it's always active. Triggers a sync
// attempt whenever the browser reports it's back online, on initial load
// if already online, and periodically as a fallback in case the 'online'
// event is missed (this can happen with flaky, rather than fully-dropped,
// signal).
export default function OfflineSyncManager() {
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.onLine) {
      syncPendingAssessments();
    }
    const handleOnline = () => {
      syncPendingAssessments();
    };
    window.addEventListener("online", handleOnline);
    const interval = setInterval(() => {
      syncPendingAssessments();
    }, 60_000);
    return () => {
      window.removeEventListener("online", handleOnline);
      clearInterval(interval);
    };
  }, []);

  return null;
}
