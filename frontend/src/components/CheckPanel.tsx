import { UploadCloud } from "lucide-react";
import { ChangeEvent, useState } from "react";
import { checkDocument, uploadDocument } from "../lib/api";
import type { CheckResponse, UploadResponse } from "../types";

const MATERIAL_TYPES = ["КТП", "Рабочая программа", "План урока", "Методическая разработка"];

export function CheckPanel() {
  const [materialType, setMaterialType] = useState(MATERIAL_TYPES[0]);
  const [upload, setUpload] = useState<UploadResponse | null>(null);
  const [result, setResult] = useState<CheckResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
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
    <section className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brand-600">Проверка</p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-950">Соответствие нормативной базе</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
        Загрузите PDF или DOCX. Система извлечет текст, найдет релевантные требования и вернет таблицу
        соответствия с источниками.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-[240px_1fr_auto]">
        <select
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none ring-brand-200 focus:ring-4"
          onChange={(event) => setMaterialType(event.target.value)}
          value={materialType}
        >
          {MATERIAL_TYPES.map((type) => (
            <option key={type}>{type}</option>
          ))}
        </select>
        <label className="flex cursor-pointer items-center justify-center gap-3 rounded-2xl border border-dashed border-brand-200 bg-brand-50 px-4 py-3 text-brand-700 transition hover:bg-brand-100">
          <UploadCloud className="h-5 w-5" />
          <span>{upload ? upload.filename : "Загрузить PDF/DOCX"}</span>
          <input accept=".pdf,.docx" className="hidden" onChange={handleFile} type="file" />
        </label>
        <button
          className="rounded-2xl bg-brand-600 px-6 py-3 font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 disabled:opacity-60"
          disabled={!upload || loading}
          onClick={runCheck}
          type="button"
        >
          Проверить
        </button>
      </div>

      {error && <p className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
      {loading && <p className="mt-4 text-sm text-slate-500">Обрабатываю документ...</p>}

      {result && (
        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
          <div className="bg-slate-50 px-5 py-4 text-sm font-medium text-slate-700">{result.summary}</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-white text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-3">Требование</th>
                  <th className="px-5 py-3">Статус</th>
                  <th className="px-5 py-3">Комментарий</th>
                  <th className="px-5 py-3">Источник</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {result.rows.map((row, index) => (
                  <tr key={`${row.requirement}-${index}`}>
                    <td className="px-5 py-4 align-top text-slate-900">{row.requirement}</td>
                    <td className="px-5 py-4 align-top">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {row.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 align-top text-slate-600">{row.comment}</td>
                    <td className="px-5 py-4 align-top text-slate-500">
                      {row.source ? `${row.source.document}, стр. ${row.source.page || "-"}` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
