"use client";
import { useEffect, useState } from "react";

// TEMPORARY diagnostic tool. Shows the real error message and source
// location directly on screen, since a proper browser console isn't
// easily reachable on iPhone alone. Safe to remove once the underlying
// bug is found.
export default function DebugErrorOverlay() {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setLogs((prev) => [
        ...prev,
        `ERROR: ${event.message}\nAt: ${event.filename}:${event.lineno}:${event.colno}\nStack: ${event.error?.stack ?? "n/a"}`,
      ]);
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      setLogs((prev) => [
        ...prev,
        `UNHANDLED REJECTION: ${reason?.message ?? String(reason)}\nStack: ${reason?.stack ?? "n/a"}`,
      ]);
    };
    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  if (logs.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: "50vh",
        overflowY: "auto",
        background: "black",
        color: "#0f0",
        fontSize: "10px",
        fontFamily: "monospace",
        padding: "8px",
        zIndex: 999999,
        whiteSpace: "pre-wrap",
      }}
    >
      <button
        onClick={() => setLogs([])}
        style={{
          background: "red",
          color: "white",
          padding: "4px 8px",
          marginBottom: "4px",
          border: "none",
        }}
      >
        Clear
      </button>
      {logs.map((log, i) => (
        <div key={i} style={{ borderTop: "1px solid #333", paddingTop: "4px", marginTop: "4px" }}>
          {log}
        </div>
      ))}
    </div>
  );
}
