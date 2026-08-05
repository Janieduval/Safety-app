export default function StopWorkWarning({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="mt-3 rounded-lg border-2 border-red-700 bg-red-50 p-4 flex gap-3 items-start"
    >
      <span className="text-2xl leading-none" aria-hidden>
        ⛔
      </span>
      <p className="text-red-800 font-semibold text-base">{message}</p>
    </div>
  );
}
