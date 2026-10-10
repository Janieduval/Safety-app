"use client";
import { useEffect, useState } from "react";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

// Gives up with a readable reason instead of waiting forever.
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(label)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

// Finds the app's background service, registering it if it isn't there yet.
async function getReadyRegistration(): Promise<ServiceWorkerRegistration> {
  let reg = await navigator.serviceWorker.getRegistration();
  if (!reg) reg = await navigator.serviceWorker.register("/sw.js");
  if (!reg.active) {
    reg = await withTimeout(
      navigator.serviceWorker.ready,
      10000,
      "the app's background service isn't ready yet"
    );
  }
  return reg;
}

async function link(assessmentId: string, sub: PushSubscription) {
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assessmentId, subscription: sub.toJSON() }),
  });
  if (!res.ok) throw new Error("the server didn't accept the sign-up");
}

export default function NotifyMe({ assessmentId }: { assessmentId: string }) {
  const [state, setState] = useState<
    "checking" | "unsupported" | "idle" | "working" | "on" | "denied" | "error"
  >("checking");
  const [detail, setDetail] = useState("");

  useEffect(() => {
    const supported =
      PUBLIC_KEY &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    if (!supported) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    if (Notification.permission === "granted") {
      // Already allowed on this phone: quietly attach it to this JSAFE too.
      getReadyRegistration()
        .then((reg) => reg.pushManager.getSubscription())
        .then(async (sub) => {
          if (sub) {
            await link(assessmentId, sub);
            setState("on");
          } else {
            setState("idle");
          }
        })
        .catch(() => setState("idle"));
      return;
    }
    setState("idle");
  }, [assessmentId]);

  const enable = async () => {
    setState("working");
    setDetail("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        return;
      }
      const reg = await getReadyRegistration();
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await withTimeout(
          reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY),
          }),
          15000,
          "the phone didn't respond to the notification sign-up"
        ));
      await link(assessmentId, sub);
      setState("on");
    } catch (e: any) {
      setDetail(e?.message ?? "unknown problem");
      setState("error");
    }
  };

  if (state === "checking") return null;

  return (
    <div className="pt-1">
      {state === "idle" && (
        <button
          type="button"
          onClick={enable}
          className="text-sm px-4 py-2 rounded-lg bg-emerald-700 text-white font-medium"
        >
          Notify me when it's reviewed
        </button>
      )}
      {state === "working" && <p className="text-sm font-normal">Setting up...</p>}
      {state === "on" && (
        <p className="text-sm font-normal">
          ✓ You'll get a notification when a supervisor reviews this.
        </p>
      )}
      {state === "denied" && (
        <p className="text-sm font-normal">
          Notifications are blocked for this app. You can turn them on in your phone's settings.
        </p>
      )}
      {state === "unsupported" && (
        <p className="text-sm font-normal">
          To get notified, open the app from your home screen icon (not the browser).
        </p>
      )}
      {state === "error" && (
        <div className="space-y-2">
          <p className="text-sm font-normal">
            Couldn't set up notifications{detail ? ` (${detail})` : ""}.
          </p>
          <button
            type="button"
            onClick={enable}
            className="text-sm px-4 py-2 rounded-lg bg-emerald-700 text-white font-medium"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
