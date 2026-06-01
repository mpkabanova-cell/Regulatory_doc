import { CheckCircle2, FileUp, Loader2, UploadCloud } from "lucide-react";
import { ChangeEvent, DragEvent, useState } from "react";
import { checkDocument, uploadDocument } from "../lib/api";
import type { CheckResponse, UploadResponse } from "../types";
import { cn } from "../lib/utils";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

const MATERIAL_TYPES = ["КТП", "Рабочая программа", "План урока", "Методическая разработка"];

export function CheckPanel() {
  const [materialType, setMaterialType] = useState(MATERIAL_TYPES[0]);
  const [upload, setUpload] = useState<UploadResponse | null>(null);
  const [result, setResult] = useState<CheckResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    await uploadSelectedFile(event.target.files?.[0]);
  }

  async function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    await uploadSelectedFile(event.dataTransfer.files?.[0]);
  }

  async function uploadSelectedFile(file?: File) {
    if (!file) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      setUpload(await uploadDocument(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить файл.");
    } finally {
      setLoading(false);
    }
  }

  async function runCheck() {
    if (!upload) return;
    setLoading(true);
    setError("");
    try {
      setResult(await checkDocument(upload.upload_id, materialType));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось выполнить проверку.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-4">
        <Card className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">compliance check</Badge>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                Проверка учебного документа
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Загрузите КТП, рабочую программу, план урока или методическую разработку. Система найдет релевантные
                нормативные требования и вернет таблицу соответствия.
              </p>
            </div>
            <select
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
              onChange={(event) => setMaterialType(event.target.value)}
              value={materialType}
            >
              {MATERIAL_TYPES.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </div>

          <label
            className={cn(
              "mt-6 flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed p-8 text-center transition",
              dragging
                ? "border-violet-300 bg-violet-50"
                : "border-slate-300 bg-slate-50 hover:border-violet-300 hover:bg-violet-50/60",
            )}
            onDragLeave={() => setDragging(false)}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDrop={handleDrop}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
              {upload ? <CheckCircle2 className="h-6 w-6 text-emerald-600" /> : <FileUp className="h-6 w-6" />}
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-900">
              {upload ? upload.filename : "Перетащите файл сюда или выберите PDF/DOCX"}
            </p>
            <p className="mt-1 text-xs text-slate-500">Максимальный размер задается backend-настройками</p>
            <input accept=".pdf,.docx" className="hidden" onChange={handleFile} type="file" />
          </label>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <ProgressLabel active={loading} upload={Boolean(upload)} result={Boolean(result)} />
            <Button disabled={!upload || loading} onClick={runCheck} type="button">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              Проверить документ
            </Button>
          </div>

          {error && <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
        </Card>

        {result && (
          <Card className="overflow-hidden">
            <div className="flex flex-col gap-2 border-b border-slate-200 bg-white px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-950">Результаты проверки</p>
                <p className="mt-1 text-sm text-slate-500">{result.summary}</p>
              </div>
              <Badge>{result.rows.length} требований</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Требование</th>
                    <th className="px-5 py-3 font-medium">Статус</th>
                    <th className="px-5 py-3 font-medium">Комментарий</th>
                    <th className="px-5 py-3 font-medium">Источник</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {result.rows.map((row, index) => (
                    <tr key={`${row.requirement}-${index}`}>
                      <td className="px-5 py-4 align-top font-medium text-slate-900">{row.requirement}</td>
                      <td className="px-5 py-4 align-top">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-5 py-4 align-top leading-6 text-slate-600">{row.comment}</td>
                      <td className="px-5 py-4 align-top text-slate-500">
                        {row.source ? `${row.source.document}, стр. ${row.source.page || "-"}` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function ProgressLabel({ active, upload, result }: { active: boolean; upload: boolean; result: boolean }) {
  const steps = [
    { label: "Файл", done: upload },
    { label: "Анализ", done: active || result },
    { label: "Таблица", done: result },
  ];

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, index) => (
        <div className="flex items-center gap-2" key={step.label}>
          <span
            className={cn(
              "flex h-7 items-center rounded-full px-3 text-xs font-medium",
              step.done ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500",
            )}
          >
            {step.label}
          </span>
          {index < steps.length - 1 && <span className="h-px w-6 bg-slate-200" />}
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const className = normalized.includes("наруш")
    ? "border-rose-200 bg-rose-50 text-rose-700"
    : normalized.includes("уточ")
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return <Badge className={className}>{status}</Badge>;
}
