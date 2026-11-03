"use client";

import { useEffect, useState } from "react";

const SEEN_KEY = "jsafe_install_guide_seen";
const OPEN_EVENT = "jsafe:open-install-guide";
const GREEN = "#047857";
const GREEN_DARK = "#065f46";
const GREEN_LIGHT = "#e7f5ef";
const AMBER = "#f5b942";
const STEP_MS = 3800;

export function openInstallGuide() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(OPEN_EVENT));
  }
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function detectPlatform() {
  const ua = navigator.userAgent || "";
  const isIOS =
    /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const inApp = /FBAN|FBAV|Instagram|Line\/|Snapchat|WhatsApp|; wv\)/i.test(ua);
  const iosNotSafari = isIOS && /CriOS|FxiOS|EdgiOS/i.test(ua);
  return { isIOS, isAndroid, inApp, iosNotSafari };
}

/* ---------- Drawing pieces for the demo phone ---------- */

function Tap() {
  return (
    <span
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: 34,
        height: 34,
        marginLeft: -17,
        marginTop: -17,
        borderRadius: "50%",
        background: "rgba(245,185,66,0.55)",
        border: `2px solid ${AMBER}`,
        animation: "jsafeTap 1.4s ease-out infinite",
        pointerEvents: "none",
        zIndex: 5,
      }}
    />
  );
}

function MiniIcon({ size = 36 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.24,
        background: "linear-gradient(160deg,#5fbf8f,#1f6b47)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: size * 0.6,
          height: size * 0.6,
          borderRadius: "50%",
          border: `${Math.max(2, Math.round(size * 0.07))}px solid #fff`,
          borderTopColor: AMBER,
          color: "#fff",
          fontWeight: 800,
          fontSize: size * 0.3,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxSizing: "border-box",
        }}
      >
        5
      </div>
    </div>
  );
}

function PageMock({ top = 0 }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: "#f3f5f4" }}>
      <div
        style={{
          background: GREEN_DARK,
          padding: `${top ? top + 12 : 26}px 12px 14px`,
          display: "flex",
          gap: 10,
          alignItems: "center",
        }}
      >
        <MiniIcon size={32} />
        <div>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>JSAFE</div>
          <div style={{ color: "#cdeadc", fontSize: 10 }}>
            Take 5 · Work safe · Go home safe
          </div>
        </div>
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            margin: "10px 12px 0",
            height: 40,
            borderRadius: 10,
            background: "#fff",
            border: "1px solid #e1e7e4",
          }}
        />
      ))}
    </div>
  );
}

function Dim() {
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)" }} />
  );
}

function roundBtn(size) {
  return {
    position: "relative",
    width: size,
    height: size,
    borderRadius: "50%",
    background: "#fff",
    boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 700,
    color: "#333",
    flexShrink: 0,
  };
}

function SafariBar({ tapDots }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 8,
        right: 8,
        bottom: 10,
        display: "flex",
        gap: 6,
        alignItems: "center",
      }}
    >
      <div style={roundBtn(32)}>‹</div>
      <div
        style={{
          flex: 1,
          height: 32,
          borderRadius: 16,
          background: "#fff",
          boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 9.5,
          color: "#222",
        }}
      >
        safety-app01.vercel.app
      </div>
      <div style={{ ...roundBtn(32), outline: tapDots ? `2px solid ${AMBER}` : "none" }}>
        •••
        {tapDots && <Tap />}
      </div>
    </div>
  );
}

function MenuList({ items, tapIndex, style }) {
  return (
    <div
      style={{
        position: "absolute",
        background: "rgba(252,252,252,0.98)",
        borderRadius: 16,
        boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
        padding: "4px 0",
        ...style,
      }}
    >
      {items.map((it, i) => (
        <div
          key={i}
          style={{
            position: "relative",
            padding: "8px 12px",
            fontSize: 12,
            display: "flex",
            gap: 8,
            alignItems: "center",
            borderTop: i ? "1px solid #eee" : "none",
            background: i === tapIndex ? "#fff3d6" : "transparent",
            fontWeight: i === tapIndex ? 700 : 400,
          }}
        >
          <span style={{ width: 16, textAlign: "center" }}>{it.icon}</span>
          {it.label}
          {i === tapIndex && <Tap />}
        </div>
      ))}
    </div>
  );
}

function Sheet({ top, children }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 4,
        right: 4,
        bottom: 0,
        top,
        background: "#eef3f1",
        borderRadius: "22px 22px 0 0",
        overflow: "hidden",
        boxShadow: "0 -4px 16px rgba(0,0,0,0.2)",
      }}
    >
      {children}
    </div>
  );
}

function ShareHeader() {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        alignItems: "center",
        padding: "14px 12px 10px",
        borderBottom: "1px solid #d9e2de",
      }}
    >
      <MiniIcon size={38} />
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          JSAFE App – Daily Task Safety…
        </div>
        <div style={{ fontSize: 10, color: "#5c7a6c" }}>safety-app01.vercel.app</div>
      </div>
    </div>
  );
}

function AppRow() {
  const apps = [
    ["#1f8bff", "AirDrop"],
    ["#34c759", "Messages"],
    ["#2f7cf6", "Mail"],
    ["#ffd84d", "Notes"],
  ];
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-around",
        padding: "10px 4px",
        borderBottom: "1px solid #d9e2de",
      }}
    >
      {apps.map(([c, l]) => (
        <div key={l} style={{ width: 50, textAlign: "center" }}>
          <div
            style={{ width: 38, height: 38, margin: "0 auto", borderRadius: 10, background: c }}
          />
          <div style={{ fontSize: 9, marginTop: 4, color: "#333" }}>{l}</div>
        </div>
      ))}
    </div>
  );
}

function ActionRow({ lastGlyph, lastLabel, tapLast }) {
  const items = [
    ["⧉", "Copy"],
    ["🔖", "Bookmark"],
    ["👓", "Reading List"],
    [lastGlyph, lastLabel],
  ];
  return (
    <div style={{ display: "flex", justifyContent: "space-around", padding: "10px 4px" }}>
      {items.map(([g, l], i) => {
        const tap = tapLast && i === 3;
        return (
          <div key={i} style={{ width: 50, textAlign: "center" }}>
            <div
              style={{
                position: "relative",
                width: 38,
                height: 38,
                margin: "0 auto",
                borderRadius: "50%",
                background: "#dde3e1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 15,
                outline: tap ? `2px solid ${AMBER}` : "none",
              }}
            >
              {g}
              {tap && <Tap />}
            </div>
            <div style={{ fontSize: 9, marginTop: 4, color: "#333", fontWeight: tap ? 700 : 400 }}>
              {l}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AddDialog() {
  return (
    <div style={{ position: "absolute", inset: 0, background: "#f2f2f7" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "28px 10px 12px",
        }}
      >
        <div style={roundBtn(30)}>✕</div>
        <div style={{ fontSize: 12, fontWeight: 700 }}>Add to Home Screen</div>
        <div
          style={{
            position: "relative",
            padding: "7px 14px",
            borderRadius: 16,
            background: "#2f7cf6",
            color: "#fff",
            fontSize: 12,
            fontWeight: 700,
            outline: `2px solid ${AMBER}`,
          }}
        >
          Add
          <Tap />
        </div>
      </div>
      <div
        style={{
          background: "#fff",
          display: "flex",
          gap: 10,
          alignItems: "center",
          padding: "10px 12px",
        }}
      >
        <MiniIcon size={40} />
        <div>
          <div style={{ fontSize: 13 }}>JSAFE App</div>
          <div style={{ fontSize: 10, color: "#999" }}>https://safety-app01.vercel.app</div>
        </div>
      </div>
      <div
        style={{
          background: "#fff",
          marginTop: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: 12,
          outline: `2px solid ${AMBER}`,
          outlineOffset: -2,
        }}
      >
        <div style={{ fontSize: 12.5 }}>Open as Web App</div>
        <div
          style={{
            width: 40,
            height: 24,
            borderRadius: 12,
            background: "#34c759",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              right: 2,
              top: 2,
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "#fff",
            }}
          />
        </div>
      </div>
    </div>
  );
}

function HomeScreen({ android, noTap }) {
  const bg = android
    ? "linear-gradient(170deg,#264653,#2a9d8f)"
    : "linear-gradient(160deg,#e07a3f,#3fb0b0)";
  return (
    <div style={{ position: "absolute", inset: 0, background: bg }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          rowGap: 14,
          padding: "40px 10px 0",
        }}
      >
        {Array.from({ length: 8 }).map((_, i) =>
          i === 5 ? (
            <div key={i} style={{ textAlign: "center" }}>
              <div
                style={{
                  position: "relative",
                  display: "inline-block",
                  borderRadius: 10,
                  outline: `2px solid ${AMBER}`,
                  outlineOffset: 2,
                }}
              >
                <MiniIcon size={40} />
                {!noTap && <Tap />}
              </div>
              <div style={{ fontSize: 9, color: "#fff", marginTop: 4, fontWeight: 700 }}>
                JSAFE App
              </div>
            </div>
          ) : (
            <div key={i} style={{ textAlign: "center" }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.35)",
                  margin: "0 auto",
                }}
              />
              <div
                style={{
                  height: 8,
                  width: 28,
                  background: "rgba(255,255,255,0.35)",
                  borderRadius: 4,
                  margin: "6px auto 0",
                }}
              />
            </div>
          )
        )}
      </div>
      <div
        style={{
          position: "absolute",
          left: 10,
          right: 10,
          bottom: 10,
          height: 56,
          borderRadius: 18,
          background: "rgba(255,255,255,0.25)",
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: "rgba(255,255,255,0.4)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ChromeBar({ tapMenu }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 50,
        background: "#fff",
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "16px 8px 4px",
        boxSizing: "border-box",
        borderBottom: "1px solid #e5e5e5",
      }}
    >
      <div
        style={{
          flex: 1,
          height: 28,
          borderRadius: 14,
          background: "#f1f3f4",
          display: "flex",
          alignItems: "center",
          paddingLeft: 10,
          fontSize: 10,
          color: "#222",
        }}
      >
        safety-app01.vercel.app
      </div>
      <div
        style={{
          position: "relative",
          width: 28,
          height: 28,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          fontWeight: 700,
          color: "#333",
          outline: tapMenu ? `2px solid ${AMBER}` : "none",
        }}
      >
        ⋮
        {tapMenu && <Tap />}
      </div>
    </div>
  );
}

function AndroidDialog() {
  return (
    <div
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        top: 120,
        background: "#fff",
        borderRadius: 18,
        padding: 16,
        boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Add to Home screen</div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16 }}>
        <MiniIcon size={36} />
        <div>
          <div style={{ fontSize: 13 }}>JSAFE App</div>
          <div style={{ fontSize: 10, color: "#888" }}>safety-app01.vercel.app</div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 14,
          fontSize: 13,
          fontWeight: 700,
          color: "#1a73e8",
        }}
      >
        <div style={{ padding: "6px 8px" }}>Cancel</div>
        <div
          style={{
            position: "relative",
            padding: "6px 14px",
            borderRadius: 16,
            background: "#e8f0fe",
            outline: `2px solid ${AMBER}`,
          }}
        >
          Add
          <Tap />
        </div>
      </div>
    </div>
  );
}

/* ---------- The steps ---------- */

const IOS_MENU = [
  { icon: "⬆", label: "Share" },
  { icon: "🔖", label: "Add to Bookmarks" },
  { icon: "📖", label: "Add Bookmark to…" },
  { icon: "+", label: "New Tab" },
  { icon: "✋", label: "New Private Tab" },
];

const IOS_MORE = [
  { icon: "📖", label: "Add Bookmark to…" },
  { icon: "☆", label: "Add to Favourites" },
  { icon: "📝", label: "Add to Quick Note" },
  { icon: "🔍", label: "Find on Page" },
  { icon: "⊕", label: "Add to Home Screen" },
];

const ANDROID_MENU = [
  { icon: "+", label: "New tab" },
  { icon: "🕘", label: "History" },
  { icon: "⬇", label: "Downloads" },
  { icon: "⇪", label: "Share…" },
  { icon: "📲", label: "Add to Home screen" },
];

const IOS_SCENES = [
  {
    intro: true,
    caption: "JSAFE on your home screen, one tap away, just like a normal app.",
    render: () => <HomeScreen noTap />,
  },
  {
    caption: "Tap the ••• button at the bottom right, next to the web address.",
    note: "Older iPhones: tap the Share button at the bottom instead, then skip to step 4.",
    render: () => (
      <>
        <PageMock />
        <SafariBar tapDots />
      </>
    ),
  },
  {
    caption: "Tap Share.",
    render: () => (
      <>
        <PageMock />
        <Dim />
        <SafariBar />
        <MenuList items={IOS_MENU} tapIndex={0} style={{ right: 8, bottom: 52, width: 165 }} />
      </>
    ),
  },
  {
    caption: "Tap View More.",
    render: () => (
      <>
        <PageMock />
        <Dim />
        <Sheet top={110}>
          <ShareHeader />
          <AppRow />
          <ActionRow lastGlyph="⌄" lastLabel="View More" tapLast />
        </Sheet>
      </>
    ),
  },
  {
    caption: "Scroll down and tap Add to Home Screen.",
    render: () => (
      <>
        <PageMock />
        <Dim />
        <Sheet top={50}>
          <ShareHeader />
          <ActionRow lastGlyph="⌃" lastLabel="View Less" />
          <MenuList
            items={IOS_MORE}
            tapIndex={4}
            style={{ position: "relative", margin: "4px 10px" }}
          />
        </Sheet>
      </>
    ),
  },
  {
    caption: "Make sure Open as Web App is on (green), then tap Add.",
    render: () => <AddDialog />,
  },
  {
    caption: "Done! Open JSAFE from the green stopwatch icon on your home screen.",
    render: () => <HomeScreen />,
  },
];

const ANDROID_SCENES = [
  {
    intro: true,
    caption: "JSAFE on your home screen, one tap away, just like a normal app.",
    render: () => <HomeScreen android noTap />,
  },
  {
    caption: "Tap the ⋮ menu at the top right of Chrome.",
    render: () => (
      <>
        <PageMock top={50} />
        <ChromeBar tapMenu />
      </>
    ),
  },
  {
    caption: "Tap Add to Home screen.",
    note: "On some phones it says Install app instead.",
    render: () => (
      <>
        <PageMock top={50} />
        <Dim />
        <ChromeBar />
        <MenuList items={ANDROID_MENU} tapIndex={4} style={{ top: 46, right: 6, width: 165 }} />
      </>
    ),
  },
  {
    caption: "Tap Add (or Install) to confirm.",
    render: () => (
      <>
        <PageMock top={50} />
        <Dim />
        <ChromeBar />
        <AndroidDialog />
      </>
    ),
  },
  {
    caption: "Done! Open JSAFE from the green stopwatch icon on your home screen.",
    render: () => <HomeScreen android />,
  },
];

/* ---------- Main popup ---------- */

export default function InstallGuide() {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState(null);
  const [tab, setTab] = useState("ios");
  const [installed, setInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    const p = detectPlatform();
    setPlatform(p);
    setTab(p.isAndroid ? "android" : "ios");

    const standalone = isStandalone();
    setInstalled(standalone);

    const onPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onOpen = () => {
      setStep(0);
      setPlaying(true);
      setOpen(true);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener(OPEN_EVENT, onOpen);
    window.addEventListener("appinstalled", onInstalled);

    let timer = null;
    if (!standalone) {
      let seen = false;
      try {
        seen = localStorage.getItem(SEEN_KEY) === "1";
      } catch (err) {}
      if (!seen) timer = setTimeout(onOpen, 800);
    }

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener(OPEN_EVENT, onOpen);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const scenes = tab === "ios" ? IOS_SCENES : ANDROID_SCENES;
  const atEnd = step >= scenes.length - 1;

  useEffect(() => {
    if (!open || !playing || installed) return;
    if (atEnd) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setStep((s) => s + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [open, playing, step, tab, atEnd, installed]);

  function close() {
    setOpen(false);
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch (err) {}
  }

  function switchTab(key) {
    setTab(key);
    setStep(0);
    setPlaying(true);
  }

  async function installNow() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try {
      await deferredPrompt.userChoice;
    } catch (err) {}
    setDeferredPrompt(null);
    close();
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {}
  }

  if (!open || !platform) return null;

  const scene = scenes[Math.min(step, scenes.length - 1)];
  const browserName = tab === "ios" ? "Safari" : "Chrome";
  const wrongBrowser = platform.inApp || platform.iosNotSafari;
  const stepCount = scenes.filter((s) => !s.intro).length;
  const stepNum = scenes.slice(0, step + 1).filter((s) => !s.intro).length;

  const ctrlBtn = {
    height: 40,
    minWidth: 40,
    borderRadius: 20,
    border: `1px solid ${GREEN}`,
    background: "#fff",
    color: GREEN,
    fontWeight: 700,
    fontSize: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 12px",
  };

  return (
    <div
      onClick={close}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
      }}
    >
      <style>{`
        @keyframes jsafeTap {
          0% { transform: scale(0.6); opacity: 1; }
          70% { transform: scale(1.5); opacity: 0; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes jsafeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: none; }
        }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 20,
          width: "100%",
          maxWidth: 420,
          maxHeight: "94vh",
          overflowY: "auto",
          boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
        }}
      >
        <div
          style={{
            background: `linear-gradient(135deg, #3fa877, ${GREEN})`,
            color: "#fff",
            padding: "14px 16px",
            borderRadius: "20px 20px 0 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div>
            <div style={{ fontSize: 17, fontWeight: 800 }}>Add JSAFE to your home screen</div>
            <div style={{ fontSize: 13, opacity: 0.9, marginTop: 2 }}>
              Watch how · opens like a normal app
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            style={{
              padding: "8px 14px",
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.5)",
              background: "rgba(255,255,255,0.15)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 15,
              flexShrink: 0,
            }}
          >
            Close
          </button>
        </div>

        <div style={{ padding: 16 }}>
          {installed ? (
            <p style={{ fontSize: 16, margin: 0 }}>
              You’re already using JSAFE from your home screen. Nothing else to do!
            </p>
          ) : (
            <>
              {wrongBrowser && (
                <div
                  style={{
                    background: "#fff4e5",
                    border: "1px solid #f5c27a",
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 14,
                    fontSize: 14,
                  }}
                >
                  <strong>First, open this page in {browserName}.</strong>
                  <div style={{ marginTop: 6 }}>
                    You’re viewing JSAFE inside another app. Copy the link, open {browserName},
                    and paste it into the address bar.
                  </div>
                  <button
                    type="button"
                    onClick={copyLink}
                    style={{
                      marginTop: 10,
                      padding: "8px 14px",
                      borderRadius: 10,
                      border: "none",
                      background: "#f5c27a",
                      fontWeight: 600,
                      fontSize: 14,
                    }}
                  >
                    {copied ? "Copied ✓" : "Copy link"}
                  </button>
                </div>
              )}

              {tab === "android" && deferredPrompt && (
                <button
                  type="button"
                  onClick={installNow}
                  style={{
                    width: "100%",
                    padding: 14,
                    borderRadius: 12,
                    border: "none",
                    background: GREEN,
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 17,
                    marginBottom: 14,
                  }}
                >
                  Install JSAFE now
                </button>
              )}

              <div
                style={{
                  display: "flex",
                  background: GREEN_LIGHT,
                  borderRadius: 12,
                  padding: 4,
                  marginBottom: 14,
                }}
              >
                {[
                  ["ios", "iPhone"],
                  ["android", "Android"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => switchTab(key)}
                    style={{
                      flex: 1,
                      padding: 8,
                      borderRadius: 10,
                      border: "none",
                      fontWeight: 600,
                      fontSize: 15,
                      background: tab === key ? "#fff" : "transparent",
                      color: tab === key ? GREEN : "#555",
                      boxShadow: tab === key ? "0 1px 4px rgba(0,0,0,0.12)" : "none",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div
                style={{
                  position: "relative",
                  width: 232,
                  height: 392,
                  margin: "0 auto",
                  border: "6px solid #1c1c1e",
                  borderRadius: 34,
                  overflow: "hidden",
                  background: "#fff",
                  boxSizing: "border-box",
                }}
              >
                <div
                  key={`${tab}-${step}`}
                  style={{
                    position: "absolute",
                    inset: 0,
                    animation: "jsafeIn 0.35s ease-out",
                  }}
                >
                  {scene.render()}
                </div>
              </div>

              <div style={{ textAlign: "center", marginTop: 14, minHeight: 64 }}>
                <div style={{ fontSize: 12, color: GREEN, fontWeight: 700 }}>
                  {scene.intro ? "What you’ll get" : `Step ${stepNum} of ${stepCount}`}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>{scene.caption}</div>
                {scene.note && (
                  <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>{scene.note}</div>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  marginTop: 12,
                }}
              >
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  disabled={step === 0}
                  style={{ ...ctrlBtn, opacity: step === 0 ? 0.4 : 1 }}
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (atEnd) {
                      setStep(0);
                      setPlaying(true);
                    } else {
                      setPlaying((p) => !p);
                    }
                  }}
                  style={{
                    ...ctrlBtn,
                    background: GREEN,
                    color: "#fff",
                    fontSize: 15,
                    padding: "0 18px",
                  }}
                >
                  {atEnd ? "↻ Replay" : playing ? "❚❚ Pause" : "▶ Play"}
                </button>
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.min(scenes.length - 1, s + 1))}
                  disabled={atEnd}
                  style={{ ...ctrlBtn, opacity: atEnd ? 0.4 : 1 }}
                >
                  ›
                </button>
              </div>

              <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 12 }}>
                {scenes.map((_, i) => (
                  <span
                    key={i}
                    onClick={() => setStep(i)}
                    style={{
                      width: i === step ? 18 : 8,
                      height: 8,
                      borderRadius: 4,
                      background: i <= step ? GREEN : "#cfd8d4",
                      transition: "all 0.2s",
                      cursor: "pointer",
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function InstallGuideButton({ label, style }) {
  return (
    <button
      type="button"
      onClick={openInstallGuide}
      style={{
        padding: "10px 16px",
        borderRadius: 12,
        border: `1px solid ${GREEN}`,
        background: GREEN_LIGHT,
        color: GREEN,
        fontWeight: 600,
        fontSize: 15,
        ...style,
      }}
    >
      {label || "📲 Add JSAFE to your home screen"}
    </button>
  );
}
