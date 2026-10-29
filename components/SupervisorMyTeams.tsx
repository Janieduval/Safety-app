"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TeamPicker, { TeamItem } from "./TeamPicker";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const OFF_KEY = "jsafe-supervisor-notify-off";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

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

// Same small notification service the workers use.
async function getPushRegistration(): Promise<ServiceWorkerRegistration> {
  const reg = await navigator.serviceWorker.register("/push-sw.js", { scope: "/push-scope/" });
  if (reg.active) return reg;
  const worker = reg.installing ?? reg.waiting;
  if (!worker) throw new Error("the notification service didn't start");
  await withTimeout(
    new Promise<void>((resolve, reject) => {
      const check = () => {
        if (worker.state === "activated") resolve();
        else if (worker.state === "redundant") reject(new Error("the notification service failed to start"));
      };
      worker.addEventListener("statechange", check);
      check();
    }),
    15000,
    "the notification service took too long to start"
  );
  return reg;
}

async function linkDevice(sub: PushSubscription) {
  const res = await fetch("/api/supervisor/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub.toJSON() }),
  });
  if (!res.ok) throw new Error("the server didn't accept the sign-up");
}

function readOff(): boolean {
  try {
    return localStorage.getItem(OFF_KEY) === "1";
  } catch {
    return false;
  }
}
function writeOff(off: boolean) {
  try {
    if (off) localStorage.setItem(OFF_KEY, "1");
    else localStorage.removeItem(OFF_KEY);
  } catch {
    // ignore
  }
}

type NotifyState = "checking" | "unsupported" | "idle" | "working" | "on" | "denied" | "error";

export default function SupervisorMyTeams({
  teams,
  initialTeamIds,
  showingMine,
  allHref,
  mineHref,
}: {
  teams: TeamItem[];
  initialTeamIds: string[];
  showingMine: boolean;
  allHref: string;
  mineHref: string;
}) {
  const router = useRouter();
  const [teamIds, setTeamIds] = useState<string[]>(initialTeamIds);
  const [editing, setEditing] = useState(false);
  const [notify, setNotify] = useState<NotifyState>("checking");
  const [detail, setDetail] = useState("");

  const myTeams = teams.filter((t) => teamIds.includes(t.id));

  useEffect(() => {
    const supported =
      PUBLIC_KEY && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    if (!supported) return setNotify("unsupported");
    if (Notification.permission === "denied") return setNotify("denied");
    if (Notification.permission === "granted" && !readOff()) {
      // Already allowed on this device: quietly make sure it's linked to this supervisor.
      getPushRegistration()
        .then((reg) => reg.pushManager.getSubscription())
        .then(async (sub) => {
          if (sub) {
            await linkDevice(sub);
            setNotify("on");
          } else setNotify("idle");
        })
        .catch(() => setNotify("idle"));
      return;
    }
    setNotify("idle");
  }, []);

  const turnOn = async () => {
    setNotify("working");
    setDetail("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setNotify("denied");
      const reg = await getPushRegistration();
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await withTimeout(
          reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY),
          }),
          15000,
          "the device didn't respond to the notification sign-up"
        ));
      await linkDevice(sub);
      writeOff(false);
      setNotify("on");
    } catch (e: any) {
      setDetail(e?.message ?? "unknown problem");
      setNotify("error");
    }
  };

  const turnOff = async () => {
    setNotify("working");
    try {
      const reg = await getPushRegistration();
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/supervisor/push", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
      }
    } catch {
      // ignore: we still remember the choice on this device
    }
    writeOff(true);
    setNotify("idle");
  };

  const saveTeams = async (ids: string[]) => {
    const res = await fetch("/api/supervisor/teams", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamIds: ids }),
    });
    if (!res.ok) throw new Error("Could not save your teams.");
    const body = await res.json();
    setTeamIds(body.teamIds ?? ids);
    setEditing(false);
    router.refresh();
  };

  const seg = (active: boolean) =>
    `flex-1 text-center text-sm py-1.5 rounded-full font-semibold ${
      active ? "bg-emerald-700 text-white" : "text-neutral-600 hover:text-neutral-900"
    }`;

  return (
    <section className="mb-5 bg-white rounded-2xl border border-neutral-200 shadow-sm p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-bold text-neutral-900">My teams</h2>
          <p className="text-xs text-neutral-500">
            Get a notification when one of your teams submits a JSAFE for review.
          </p>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="shrink-0 text-sm px-3 py-1.5 rounded-full border border-emerald-700 text-emerald-700 font-semibold"
          >
            {myTeams.length ? "Edit" : "Choose teams"}
          </button>
        )}
      </div>

      <div className="mt-3">
        {editing ? (
          <TeamPicker teams={teams} selected={teamIds} onSave={saveTeams} onCancel={() => setEditing(false)} />
        ) : myTeams.length ? (
          <div className="flex flex-wrap gap-1.5">
            {myTeams.map((t) => (
              <span
                key={t.id}
                className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
              >
                {t.label}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-500">No teams chosen yet.</p>
        )}
      </div>

      {/* Notifications on this device */}
      <div className="mt-3 pt-3 border-t border-neutral-100 text-sm">
        {notify === "on" && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-emerald-800 font-medium">✓ Notifications are on for this device</p>
            <button type="button" onClick={turnOff} className="text-xs font-semibold text-neutral-500 underline">
              Turn off
            </button>
          </div>
        )}
        {notify === "idle" && (
          <button
            type="button"
            onClick={turnOn}
            className="text-sm px-4 py-2 rounded-xl bg-emerald-700 text-white font-semibold"
          >
            Turn on notifications
          </button>
        )}
        {notify === "working" && <p className="text-neutral-600">Setting up...</p>}
        {notify === "denied" && (
          <p className="text-neutral-600">
            Notifications are blocked for JSAFE on this device. You can allow them in your phone or browser settings.
          </p>
        )}
        {notify === "unsupported" && (
          <p className="text-neutral-600">
            To get notifications on a phone, open JSAFE from your home screen icon (not the browser).
          </p>
        )}
        {notify === "error" && (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-neutral-600">Couldn't turn on notifications{detail ? ` (${detail})` : ""}.</p>
            <button type="button" onClick={turnOn} className="text-xs font-semibold text-emerald-700 underline">
              Try again
            </button>
          </div>
        )}
      </div>

      {/* Show everything, or just my teams */}
      {myTeams.length > 0 && (
        <div className="mt-3 flex p-1 rounded-full bg-neutral-100">
          <Link href={allHref} className={seg(!showingMine)}>
            All teams
          </Link>
          <Link href={mineHref} className={seg(showingMine)}>
            My teams
          </Link>
        </div>
      )}
    </section>
  );
}
