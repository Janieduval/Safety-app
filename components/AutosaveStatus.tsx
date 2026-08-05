export default function AutosaveStatus({
  status,
}: {
  status: "idle" | "saving" | "saved" | "error";
}) {
  const map = {
    idle: { text: "Not yet saved", color: "text-neutral-400" },
    saving: { text: "Saving...", color: "text-neutral-500" },
    saved: { text: "Saved", color: "text-emerald-700" },
    error: { text: "Save failed — check connection", color: "text-red-700" },
  } as const;
  const { text, color } = map[status];
  return <span className={`text-xs font-medium ${color}`}>{text}</span>;
}
