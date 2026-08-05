"use client";

import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";

export default function SignaturePad({
  onCapture,
  disabled,
}: {
  onCapture: (dataUrl: string) => void;
  disabled?: boolean;
}) {
  const padRef = useRef<SignatureCanvas>(null);
  const [empty, setEmpty] = useState(true);

  const clear = () => {
    padRef.current?.clear();
    setEmpty(true);
  };

  const confirm = () => {
    if (!padRef.current || padRef.current.isEmpty()) return;
    const dataUrl = padRef.current.getTrimmedCanvas().toDataURL("image/png");
    onCapture(dataUrl);
  };

  return (
    <div className="w-full">
      <div className="border-2 border-neutral-300 rounded-lg bg-white touch-none">
        <SignatureCanvas
          ref={padRef}
          penColor="#1f2937"
          canvasProps={{ className: "w-full h-40" }}
          onBegin={() => setEmpty(false)}
        />
      </div>
      <div className="flex gap-3 mt-3">
        <button
          type="button"
          onClick={clear}
          disabled={disabled}
          className="flex-1 py-3 rounded-lg border border-neutral-400 text-neutral-700 font-medium active:bg-neutral-100"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={disabled || empty}
          className="flex-1 py-3 rounded-lg bg-emerald-700 text-white font-semibold disabled:bg-neutral-300 disabled:text-neutral-500 active:bg-emerald-800"
        >
          Confirm signature
        </button>
      </div>
    </div>
  );
}
