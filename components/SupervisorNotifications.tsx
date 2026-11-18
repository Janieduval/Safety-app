"use client";

import { useEffect, useState } from "react";
import type { TeamItem } from "./TeamPicker";
import { openInstallGuide } from "./InstallGuide";

// The "Notifications" card on the supervisor dashboard, next to My teams.
// - Notify me when my teams' Take 5 has been completed (on/off)
// - Get a reminder at 9am about Take 5s not reviewed yet (on/off), and which days
// - Tell me if these teams haven't done a Take 5 (in the same 9am reminder)
// Everything is saved with "Save notification settings". Saving with anything
// on also signs this phone or computer up for notifications.

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const OFF_KEY = "jsafe-supervisor-notify-off";

const DAYS = [
  ["mon", "Mon"],
  ["tue", "Tue"],
  ["wed", "Wed"],
  ["thu", "Thu"],
  ["fri", "Fri"],
  ["sat", "Sat"],
  ["sun", "Sun"],
] as const;

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

type DeviceState = "checking" | "unsupported" | "idle" | "working" | "on" | "denied" | "error";

function Switch({
  on,
  onChange,
  label,
  disabled,
}: {
  on: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative shrink-0 w-12 h-7 rounded-full transition-colors disabled:opacity-50 ${
        on ? "bg-emerald-700" : "bg-neutral-300"
      }`}
    >
      <span
        className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-5" : ""
        }`}
      />
    </button>
  );
}

function Row({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-neutral-900">{title}</p>
        <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">{text}</p>
      </div>
      {children}
    </div>
  );
}

export default function SupervisorNotifications({
  teams,
  myTeamIds,
  canChooseTeams,
  initialReviews,
  initialReminderOn,
  initialDays,
  initialWatch,
}: {
  teams: TeamItem[];
  myTeamIds: string[];
  canChooseTeams: boolean; // false when the admin sets supervisors' teams
  initialReviews: boolean;
  initialReminderOn: boolean;
  initialDays: string[];
  initialWatch: string[];
}) {
  // ----- This phone or computer -----
  const [device, setDevice] = useState<DeviceState>("checking");
  const [detail, setDetail] = useState("");
  const [standalone, setStandalone] = useState(true);

  useEffect(() => {
    setStandalone(
      window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true
    );
    const supported =
      PUBLIC_KEY && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    if (!supported) return setDevice("unsupported");
    if (Notification.permission === "denied") return setDevice("denied");
    if (Notification.permission === "granted" && !readOff()) {
      // Already allowed on this device: quietly make sure it's linked to this supervisor.
      getPushRegistration()
        .then((reg) => reg.pushManager.getSubscription())
        .then(async (sub) => {
          if (sub) {
            await linkDevice(sub);
            setDevice("on");
          } else setDevice("idle");
        })
        .catch(() => setDevice("idle"));
      return;
    }
    setDevice("idle");
  }, []);

  // Asks to allow notifications and links this device. Returns true when it worked.
  const signUpDevice = async (): Promise<boolean> => {
    setDevice("working");
    setDetail("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setDevice("denied");
        return false;
      }
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
      setDevice("on");
      return true;
    } catch (e: any) {
      setDetail(e?.message ?? "unknown problem");
      setDevice("error");
      return false;
    }
  };

  // ----- The settings -----
  const [reviews, setReviews] = useState(initialReviews);
  const [reminderOn, setReminderOn] = useState(initialReminderOn);
  const [days, setDays] = useState<string[]>(initialDays);
  const [watch, setWatch] = useState<string[]>(initialWatch);
  const [saved, setSaved] = useState({
    reviews: initialReviews,
    reminderOn: initialReminderOn,
    days: initialDays,
    watch: initialWatch,
  });
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Teams to choose from: every team where supervisors pick their own,
  // otherwise only the teams the admin gave them.
  const choices = canChooseTeams ? teams : teams.filter((t) => myTeamIds.includes(t.id));

  const same = (a: string[], b: string[]) => a.slice().sort().join() === b.slice().sort().join();
  const changed =
    reviews !== saved.reviews ||
    reminderOn !== saved.reminderOn ||
    !same(days, saved.days) ||
    !same(watch, saved.watch);
  const anythingOn = reviews || reminderOn || watch.length > 0;
  // Also lets them save when nothing changed but this device isn't signed up yet.
  const canSave = changed || (anythingOn && device === "idle");

  const toggle = (list: string[], set: (v: string[]) => void, id: string) => {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
    setState("idle");
  };

  const save = async () => {
    setState("saving");
    // Sign this device up first, while the tap still counts as the person's
    // own action (phones only allow the "Allow notifications?" question then).
    if (anythingOn && device === "idle") await signUpDevice();
    const res = await fetch("/api/supervisor/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notifyReviews: reviews, reminderOn, days, watchTeamIds: watch }),
    }).catch(() => null);
    if (!res?.ok) return setState("error");
    const body = await res.json();
    setReviews(body.notifyReviews);
    setReminderOn(body.reminderOn);
    setDays(body.days);
    setWatch(body.watchTeamIds);
    setSaved({ reviews: body.notifyReviews, reminderOn: body.reminderOn, days: body.days, watch: body.watchTeamIds });
    setState("saved");
  };

  const chip = (on: boolean) =>
    `text-sm px-3 py-1.5 rounded-full border font-semibold ${
      on ? "bg-emerald-700 border-emerald-700 text-white" : "bg-white border-neutral-300 text-neutral-700"
    }`;

  return (
    <section className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4">
      <h2 className="font-bold text-neutral-900">Notifications</h2>

      {/* 1. Take 5 completed */}
      <div className="mt-4">
        <Row
          title="Notify me when my teams' Take 5 has been completed"
          text="A notification on this phone or computer when one of your teams finishes a Take 5."
        >
          <Switch
            on={reviews}
            onChange={() => {
              setReviews(!reviews);
              setState("idle");
            }}
            label="Notify me when my teams' Take 5 has been completed"
          />
        </Row>
        <div className="mt-2 space-y-1.5 text-xs leading-relaxed">
          {device === "on" && <p className="text-emerald-800 font-medium">✓ Notifications are allowed on this device</p>}
          {device === "working" && <p className="text-neutral-600">Setting up...</p>}
          {device === "idle" && anythingOn && (
            <p className="text-neutral-600">When you save, this device will ask to allow notifications. Tap Allow.</p>
          )}
          {device === "denied" && (
            <p className="text-amber-700">
              Notifications are blocked for JSAFE on this device. You can allow them in your phone or browser settings.
            </p>
          )}
          {device === "unsupported" && (
            <p className="text-amber-700">
              To get notifications on a phone, open JSAFE from your home screen icon (not the browser).
            </p>
          )}
          {device === "error" && (
            <p className="text-red-700">Couldn&apos;t turn on notifications{detail ? ` (${detail})` : ""}. Try saving again.</p>
          )}
          {!standalone && (
            <button type="button" onClick={openInstallGuide} className="font-semibold text-emerald-700 underline">
              How to add JSAFE to your home screen
            </button>
          )}
        </div>
      </div>

      {/* 2. 9am reminder */}
      <div className="mt-4 pt-4 border-t border-neutral-100">
        <Row
          title="Get a reminder at 9am"
          text="If any of your teams' Take 5s haven't been reviewed yet, by you or another supervisor."
        >
          <Switch
            on={reminderOn}
            onChange={() => {
              setReminderOn(!reminderOn);
              setState("idle");
            }}
            label="Get a reminder at 9am"
          />
        </Row>
        <p className="mt-4 text-sm font-semibold text-neutral-800">Which days would you like to have the reminder?</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {DAYS.map(([key, label]) => (
            <button key={key} type="button" onClick={() => toggle(days, setDays, key)} className={chip(days.includes(key))}>
              {label}
            </button>
          ))}
        </div>
        {days.length === 0 && (
          <p className="mt-2 text-xs text-amber-700 font-medium">No days ticked, so no 9am reminder will come.</p>
        )}
      </div>

      {/* 3. Teams with no Take 5 */}
      <div className="mt-4 pt-4 border-t border-neutral-100">
        <p className="text-sm font-semibold text-neutral-900">Tell me if these teams haven&apos;t done a Take 5</p>
        <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
          At 9am, on the days above. Tick the teams working on site.
        </p>
        {choices.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">
            {canChooseTeams ? "No teams yet." : "No teams yet. Ask the admin to set your teams."}
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {choices.map((t) => (
              <button key={t.id} type="button" onClick={() => toggle(watch, setWatch, t.id)} className={chip(watch.includes(t.id))}>
                {watch.includes(t.id) ? "✓ " : ""}
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={!canSave || state === "saving"}
          className="text-sm px-4 py-2.5 rounded-xl bg-emerald-700 text-white font-semibold disabled:opacity-40"
        >
          {state === "saving" ? "Saving..." : "Save notification settings"}
        </button>
        {!changed && state === "saved" && <p className="text-sm text-emerald-800 font-medium">✓ Saved</p>}
        {state === "error" && <p className="text-sm text-red-700 font-medium">Couldn&apos;t save. Try again.</p>}
      </div>
    </section>
  );
}
