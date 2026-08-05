"use client";

export default function YesNoButtons({
  value,
  onChange,
  disabled,
}: {
  value: boolean | null | undefined;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(true)}
        className={`flex-1 py-4 rounded-lg text-lg font-semibold border-2 transition-colors ${
          value === true
            ? "bg-emerald-700 border-emerald-700 text-white"
            : "bg-white border-neutral-300 text-neutral-800 active:bg-neutral-100"
        }`}
      >
        Yes
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(false)}
        className={`flex-1 py-4 rounded-lg text-lg font-semibold border-2 transition-colors ${
          value === false
            ? "bg-red-700 border-red-700 text-white"
            : "bg-white border-neutral-300 text-neutral-800 active:bg-neutral-100"
        }`}
      >
        No
      </button>
    </div>
  );
}
