import { ChevronDown, FileText, Quote } from "lucide-react";
import { useState } from "react";
import type { Source } from "../types";
import { Badge } from "./ui/badge";

type Props = {
  source: Source;
  index: number;
};

export function SourceCard({ source, index }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300">
      <button
        className="flex w-full items-start justify-between gap-3 text-left"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span className="flex gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
            {index}
          </span>
          <span className="min-w-0">
            <span className="line-clamp-2 block text-sm font-semibold leading-5 text-slate-900">{source.document}</span>
            <span className="mt-2 flex flex-wrap gap-1.5">
              <Badge>стр. {source.page || "-"}</Badge>
              <Badge>{source.type}</Badge>
            </span>
          </span>
        </span>
        <ChevronDown className={`mt-1 h-4 w-4 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-500">
            <Quote className="h-3.5 w-3.5" />
            {source.section || "Раздел не определен"}
          </div>
          <p className="leading-6 text-slate-700">“{source.quote}”</p>
          <div className="mt-3 flex items-center gap-2 truncate text-xs text-slate-500">
            <FileText className="h-3.5 w-3.5" />
            <span className="truncate">{source.source_path}</span>
          </div>
        </div>
      )}
    </div>
  );
}
