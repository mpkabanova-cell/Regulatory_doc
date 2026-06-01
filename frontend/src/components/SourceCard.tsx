import { ExternalLink, FileText, Quote } from "lucide-react";
import { useState } from "react";
import type { Source } from "../types";
import { cn } from "../lib/utils";
import { Badge } from "./ui/badge";

type Props = {
  source: Source;
  index: number;
  compact?: boolean;
};

export function SourceCard({ source, index, compact = false }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={cn(
        "rounded-3xl border border-violet-50 bg-white shadow-[0_10px_28px_rgba(93,89,135,0.06)] transition hover:border-violet-100 hover:shadow-[0_16px_34px_rgba(111,76,255,0.12)]",
        compact ? "p-3" : "p-4",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-semibold text-emerald-700 shadow-sm">
          {index}
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn("line-clamp-2 font-semibold leading-5 text-slate-900", compact ? "text-[13px]" : "text-sm")}>
            {source.document}
          </p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
            {source.section || "Раздел не определен"}
          </p>
          <div className={cn("flex flex-wrap items-center gap-1.5", compact ? "mt-2" : "mt-3")}>
            <Badge className="border-slate-100 bg-slate-50">стр. {source.page || "-"}</Badge>
            <Badge className="border-violet-100 bg-violet-50 text-violet-700">{source.type}</Badge>
            {source.level && <Badge className="border-slate-100 bg-slate-50">{source.level.toUpperCase()}</Badge>}
          </div>
        </div>
        <button
          className="shrink-0 rounded-full bg-[#f8f5ff] px-3 py-1 text-xs font-semibold text-violet-600 transition hover:bg-violet-100 hover:text-violet-800"
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          {open ? "свернуть" : "цитата"}
        </button>
      </div>

      {open && (
        <div className="mt-4 rounded-2xl border border-violet-100 bg-[#fbf8ff] p-3 text-sm text-slate-700">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-500">
            <Quote className="h-3.5 w-3.5" />
            Цитата из источника
          </div>
          <p className="leading-6 text-slate-700">“{source.quote}”</p>
          <div className="mt-3 flex items-center gap-2 truncate text-xs text-slate-500">
            <FileText className="h-3.5 w-3.5" />
            <span className="truncate">{source.source_path}</span>
            {source.source_url && <ExternalLink className="h-3.5 w-3.5" />}
          </div>
        </div>
      )}
    </div>
  );
}
