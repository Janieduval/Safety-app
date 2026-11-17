// The project's name, with the company under it, at the top of the admin and
// supervisor pages. Works on both server and client pages.
export default function ProjectPill({
  name,
  company,
  className = "",
}: {
  name: string | null | undefined;
  company?: string | null;
  className?: string;
}) {
  if (!name && !company) return null;
  return (
    <div className={`min-w-0 ${className}`}>
      {name && (
        <span className="inline-flex max-w-full items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-white/15 ring-1 ring-white/25 text-white">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
          <span className="truncate">{name}</span>
        </span>
      )}
      {company && <p className="mt-1.5 px-0.5 text-xs text-emerald-50/85 truncate">{company}</p>}
    </div>
  );
}
