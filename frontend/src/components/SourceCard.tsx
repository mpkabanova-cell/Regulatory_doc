import { ChevronDown, FileText } from "lucide-react";
import { useState } from "react";
import type { Source } from "../types";

type Props = {
  source: Source;
  index: number;
};

export function SourceCard({ source, index }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm">
      <button
        className="flex w-full items-start justify-between gap-3 text-left"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span className="flex gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-semibold text-emerald-700">
            {index}
          </span>
          <span>
            <span className="block font-semibold text-slate-900">{source.document}</span>
            <span className="mt-1 block text-sm text-slate-500">
              {source.section || "Раздел не определен"} · стр. {source.page || "-"}
            </span>
          </span>
        </span>
        <ChevronDown className={`mt-1 h-4 w-4 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
          <p className="leading-6">“{source.quote}”</p>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <FileText className="h-3.5 w-3.5" />
            <span>{source.source_path}</span>
          </div>
        </div>
      )}
    </div>
  );
}
