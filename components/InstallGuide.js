"use client";

import { useEffect, useState } from "react";

const SEEN_KEY = "jsafe_install_guide_seen";
const OPEN_EVENT = "jsafe:open-install-guide";
const GREEN = "#2f7a57";
const GREEN_LIGHT = "#e8f4ee";

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

const IOS_STEPS = [
  {
    text: "Tap the ••• button at the bottom right, next to the web address.",
    sub: "Older iPhones: tap the Share button (square with an arrow) at the bottom, then skip to step 4.",
  },
  { text: "Tap Share." },
  { text: "Tap View More." },
  { text: "Scroll down and tap Add to Home Screen." },
  { text: "Make sure Open as Web App is switched on (green), then tap Add." },
];

const ANDROID_STEPS = [
  { text: "Tap the ⋮ menu at the top right of Chrome." },
  { text: "Tap Install app or Add to Home screen." },
  { text: "Tap Install (or Add) to confirm." },
];

export default function InstallGuide() {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState(null);
  const [tab, setTab] = useState("ios");
  const [installed, setInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [copied, setCopied] = useState(false);

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
    const onOpen = () => setOpen(true);
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
      if (!seen) timer = setTimeout(() => setOpen(true), 800);
    }

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener(OPEN_EVENT, onOpen);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function close() {
    setOpen(false);
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch (err) {}
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

  const steps = tab === "ios" ? IOS_STEPS : ANDROID_STEPS;
  const browserName = tab === "ios" ? "Safari" : "Chrome";
  const wrongBrowser = platform.inApp || platform.iosNotSafari;

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
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 20,
          width: "100%",
          maxWidth: 440,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
          fontFamily: "inherit",
        }}
      >
        <div
          style={{
            background: GREEN,
            color: "#fff",
            padding: "18px 20px",
            borderRadius: "20px 20px 0 0",
          }}
        >
          <div style={{ fontSize: 19, fontWeight: 700 }}>
            Add JSAFE to your home screen
          </div>
          <div style={{ fontSize: 14, opacity: 0.9, marginTop: 4 }}>
            Opens like a normal app, full screen, and works offline.
          </div>
        </div>

        <div style={{ padding: 20 }}>
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
                    marginBottom: 16,
                    fontSize: 15,
                  }}
                >
                  <strong>First, open this page in {browserName}.</strong>
                  <div style={{ marginTop: 6 }}>
                    You’re viewing JSAFE inside another app. Copy the link, open{" "}
                    {browserName}, and paste it into the address bar.
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
                      fontSize: 15,
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
                    marginBottom: 16,
                  }}
                >
                  Install JSAFE
                </button>
              )}

              <div
                style={{
                  display: "flex",
                  background: GREEN_LIGHT,
                  borderRadius: 12,
                  padding: 4,
                  marginBottom: 16,
                }}
              >
                {[
                  ["ios", "iPhone"],
                  ["android", "Android"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    style={{
                      flex: 1,
                      padding: 10,
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

              <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {steps.map((s, i) => (
                  <li
                    key={i}
                    style={{ display: "flex", gap: 12, marginBottom: 14 }}
                  >
                    <div
                      style={{
                        flexShrink: 0,
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        background: GREEN,
                        color: "#fff",
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {i + 1}
                    </div>
                    <div style={{ fontSize: 16, paddingTop: 4 }}>
                      {s.text}
                      {s.sub && (
                        <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>
                          {s.sub}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>

              <p style={{ fontSize: 14, color: "#555", margin: "4px 0 0" }}>
                Then open JSAFE from the green stopwatch icon on your home screen.
              </p>
            </>
          )}

          <button
            type="button"
            onClick={close}
            style={{
              width: "100%",
              marginTop: 18,
              padding: 12,
              borderRadius: 12,
              border: `2px solid ${GREEN}`,
              background: "#fff",
              color: GREEN,
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            Got it
          </button>
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
