"use client";

import { useEffect, useRef, useState } from "react";
import { isLocalId } from "@/lib/offlineStore";

export type HazardPhoto = {
  id: string;
  kind: string;
  url: string;
  createdAt?: string;
};

const MAX_PHOTOS = 3;
const MAX_DIMENSION = 1600; // longest side in pixels after shrinking
const JPEG_QUALITY = 0.75;

// Shrinks a phone photo (often 3–8 MB) down to a few hundred KB so it
// uploads quickly on weak site signal.
async function shrinkImage(file: File): Promise<Blob> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Couldn't read that photo. Try taking it again."));
      el.src = objectUrl;
    });

    const longest = Math.max(img.naturalWidth, img.naturalHeight);
    const scale = Math.min(1, MAX_DIMENSION / longest);
    const width = Math.round(img.naturalWidth * scale);
    const height = Math.round(img.naturalHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Couldn't process that photo.");
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );
    if (!blob) throw new Error("Couldn't process that photo.");
    return blob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export default function HazardPhotos({
  hazardCardId,
  assessmentId,
  kind,
  label,
  initialPhotos,
  readOnly,
}: {
  hazardCardId: string;
  assessmentId: string;
  kind: "hazard" | "control";
  label: string;
  initialPhotos?: HazardPhoto[];
  readOnly?: boolean;
}) {
  const [photos, setPhotos] = useState<HazardPhoto[]>(() =>
    (initialPhotos ?? []).filter((p) => p.kind === kind)
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  // Cards created while offline only exist on the phone until they sync,
  // so there's nothing on the server to attach a photo to yet.
  const notSyncedYet = isLocalId(assessmentId) || isLocalId(hazardCardId);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets the same photo be picked again after an error
    if (!file) return;

    setError(null);
    setUploading(true);
    try {
      const shrunk = await shrinkImage(file);
      const form = new FormData();
      form.append("file", new File([shrunk], "photo.jpg", { type: "image/jpeg" }));
      form.append("hazardCardId", hazardCardId);
      form.append("kind", kind);

      const res = await fetch("/api/hazard-photos", { method: "POST", body: form });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error ?? "Couldn't save the photo. Try again.");
      }
      setPhotos((prev) => [...prev, body.photo]);
    } catch (err: any) {
      setError(
        navigator.onLine
          ? err?.message ?? "Couldn't save the photo. Try again."
          : "No signal, so the photo wasn't saved. Try again once you have signal."
      );
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async (photo: HazardPhoto) => {
    // First tap asks for confirmation, second tap removes.
    if (confirmDeleteId !== photo.id) {
      setConfirmDeleteId(photo.id);
      return;
    }
    setConfirmDeleteId(null);
    setError(null);

    const before = photos;
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    try {
      const res = await fetch(`/api/hazard-photos?id=${encodeURIComponent(photo.id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Couldn't remove the photo. Try again.");
      }
    } catch (err: any) {
      setPhotos(before);
      setError(err?.message ?? "Couldn't remove the photo. Try again.");
    }
  };

  if (readOnly && photos.length === 0) return null;

  return (
    <div>
      <p className="block text-sm font-semibold text-neutral-700 mb-1">{label}</p>

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-2">
          {photos.map((p) => (
            <div key={p.id}>
              <a href={p.url} target="_blank" rel="noreferrer" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt={label}
                  className="w-full aspect-square object-cover rounded-lg border border-neutral-300 bg-white"
                />
              </a>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => removePhoto(p)}
                  className={`mt-1 w-full text-xs font-medium ${
                    confirmDeleteId === p.id ? "text-white bg-red-700 rounded py-1" : "text-red-700"
                  }`}
                >
                  {confirmDeleteId === p.id ? "Tap to confirm" : "Remove"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!readOnly && (
        <>
          {notSyncedYet ? (
            <p className="text-sm text-neutral-500">
              Photos can be added once this assessment has synced with signal.
            </p>
          ) : !online ? (
            <p className="text-sm text-amber-700 font-medium">
              Needs signal. Photos can't be added while offline.
            </p>
          ) : photos.length < MAX_PHOTOS ? (
            <>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="w-full py-2.5 rounded-lg border-2 border-dashed border-neutral-400 text-neutral-700 font-medium bg-white disabled:opacity-50"
              >
                {uploading ? "Uploading photo..." : "+ Add photo"}
              </button>
            </>
          ) : (
            <p className="text-sm text-neutral-500">Maximum of {MAX_PHOTOS} photos added.</p>
          )}
        </>
      )}

      {error && <p className="text-sm text-red-700 font-medium mt-1">{error}</p>}
    </div>
  );
}
