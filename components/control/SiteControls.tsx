"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// On a project's page: choose its company, or hide it from the control centre.
export default function SiteControls({
  siteId,
  companyId,
  companies,
}: {
  siteId: string;
  companyId: string | null;
  companies: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [value, setValue] = useState(companyId ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [hiding, setHiding] = useState(false);

  const patch = async (body: object) => {
    const res = await fetch("/api/control/sites", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: siteId, ...body }),
    }).catch(() => null);
    return !!res?.ok;
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-semibold text-neutral-800">Company</label>
        <select
          value={value}
          onChange={async (e) => {
            setValue(e.target.value);
            setMsg((await patch({ companyId: e.target.value })) ? "Saved" : "Couldn't save. Try again.");
            router.refresh();
          }}
          className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 bg-white text-sm"
        >
          <option value="">No company</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-neutral-500">
          {msg ?? "If the site's COMPANY setting says otherwise, it moves back the next time it connects."}
        </p>
      </div>
      {hiding ? (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-3">
          <p className="text-sm font-semibold text-red-900">Hide this project from the control centre?</p>
          <p className="text-xs text-red-800 mt-0.5">The site itself keeps working, it just stops showing here.</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={async () => {
                if (await patch({ archived: true })) router.push("/control");
              }}
              className="text-sm px-3 py-1.5 rounded-lg bg-red-600 text-white font-semibold"
            >
              Yes, hide it
            </button>
            <button type="button" onClick={() => setHiding(false)} className="text-sm px-3 py-1.5 rounded-lg border border-neutral-300 bg-white">
              Keep
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setHiding(true)} className="text-xs font-semibold text-neutral-500 underline">
          Hide this project from the control centre
        </button>
      )}
    </div>
  );
}
