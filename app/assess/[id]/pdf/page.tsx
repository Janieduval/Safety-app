"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// The Take 5 PDF for workers, inside the app: a green bar with Back and
// Download, and the PDF pages underneath to scroll through. On a phone, a PDF
// opened on its own from the home-screen app has no way back — this page always does.
//
// Phones can't show a PDF inside a page by themselves, so the pages are drawn
// with pdf.js (Mozilla's PDF viewer), loaded from a public CDN.

const BRAND_GRADIENT = "linear-gradient(135deg, #10b981 0%, #047857 55%, #064e3b 100%)";
const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174";

// Loads pdf.js once and hands it back.
function loadPdfJs(): Promise<any> {
  const w = window as any;
  if (w.pdfjsLib) return Promise.resolve(w.pdfjsLib);
  if (w.__pdfjsLoading) return w.__pdfjsLoading;
  w.__pdfjsLoading = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `${PDFJS}/pdf.min.js`;
    s.onload = () => {
      const lib = w.pdfjsLib;
      if (!lib) return reject(new Error("pdf.js not available"));
      lib.GlobalWorkerOptions.workerSrc = `${PDFJS}/pdf.worker.min.js`;
      resolve(lib);
    };
    s.onerror = () => reject(new Error("pdf.js failed to load"));
    document.head.appendChild(s);
  });
  return w.__pdfjsLoading;
}

export default function AssessmentPdfPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const pdfUrl = `/api/assessments/${params.id}/pdf`;
  const pagesRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [pageCount, setPageCount] = useState(0);

  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.push(`/assess/${params.id}?view=1`);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await loadPdfJs();
        const doc = await pdfjs.getDocument({ url: `${pdfUrl}?view=1` }).promise;
        if (cancelled) return;
        setPageCount(doc.numPages);
        const holder = pagesRef.current;
        if (!holder) return;
        holder.innerHTML = "";
        const width = holder.clientWidth;
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        for (let n = 1; n <= doc.numPages; n++) {
          const page = await doc.getPage(n);
          if (cancelled) return;
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: (width / base.width) * ratio });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = "100%";
          canvas.style.height = "auto";
          canvas.className = "block bg-white rounded-lg shadow-md";
          holder.appendChild(canvas);
          await page.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise;
          if (n === 1) setState("ready");
        }
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdfUrl]);

  return (
    <main className="min-h-dvh w-full min-w-0 flex flex-col bg-neutral-200">
      <header className="sticky top-0 z-10 px-4 pt-4 pb-3 text-white shadow-md" style={{ background: BRAND_GRADIENT }}>
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={goBack}
            className="flex items-center gap-1 text-sm font-semibold px-3 py-1.5 -ml-1 rounded-full bg-white/15 ring-1 ring-white/30 active:bg-white/25"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 5l-7 7 7 7" />
            </svg>
            Back
          </button>
          <div className="min-w-0 text-center">
            <p className="text-base font-bold leading-tight truncate">Take 5 PDF</p>
            {pageCount > 0 && (
              <p className="text-[11px] text-emerald-50/90">
                {pageCount} page{pageCount === 1 ? "" : "s"}
              </p>
            )}
          </div>
          <a href={`${pdfUrl}?download=1`} download className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full bg-white text-emerald-800 active:bg-emerald-50">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v3h16v-3" />
            </svg>
            Download
          </a>
        </div>
      </header>

      <div className="w-full max-w-3xl mx-auto px-3 py-4">
        {state === "loading" && (
          <div className="space-y-3" aria-label="Loading the PDF">
            <p className="text-center text-sm text-neutral-600">Loading your PDF…</p>
            <div className="aspect-[1/1.414] bg-white/70 rounded-lg animate-pulse" />
          </div>
        )}

        {state === "error" && (
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5 text-center">
            <p className="text-base font-bold text-neutral-900">The PDF can&apos;t be shown here</p>
            <p className="mt-1 text-sm text-neutral-600">You can still download it and open it on your phone.</p>
            <a href={`${pdfUrl}?download=1`} download className="mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-emerald-700 text-white font-semibold active:bg-emerald-800">
              Download PDF
            </a>
            <button
              type="button"
              onClick={goBack}
              className="mt-2 w-full py-3 rounded-xl border border-neutral-300 bg-white text-neutral-800 font-semibold active:bg-neutral-50"
            >
              ← Back
            </button>
          </div>
        )}

        {/* The PDF pages are drawn in here. */}
        <div ref={pagesRef} className={`space-y-3 ${state === "error" ? "hidden" : ""}`} />

        {state === "ready" && (
          <button
            type="button"
            onClick={goBack}
            className="mt-5 w-full py-3 rounded-xl border border-neutral-300 bg-white text-neutral-800 font-semibold active:bg-neutral-50"
          >
            ← Back to my Take 5
          </button>
        )}
      </div>
    </main>
  );
}
