import {
  BookOpen,
  Boxes,
  ClipboardCheck,
  Database,
  GraduationCap,
} from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { ChatPanel } from "./components/ChatPanel";
import { CheckPanel } from "./components/CheckPanel";
import { Button } from "./components/ui/button";
import { Card } from "./components/ui/card";
import { getHealth, getStats } from "./lib/api";
import { cn } from "./lib/utils";
import type { ChatFilters, CorpusStats } from "./types";

type Mode = "chat" | "check";
type FilterOption = {
  label: string;
  value: string;
};

const SUBJECTS_BY_LEVEL: Record<string, string[]> = {
  noo: [
    "Английский язык",
    "ИЗО",
    "Испанский язык",
    "Китайский язык",
    "Литературное чтение",
    "Математика",
    "Музыка",
    "Немецкий язык",
    "ОРКСЭ",
    "Окружающий мир",
    "Русский язык",
    "Труд технология",
    "Физическая культура",
    "Французский язык",
  ],
  ooo: [
    "Английский язык",
    "Биология",
    "Второй иностранный английский",
    "Второй иностранный испанский",
    "Второй иностранный китайский",
    "Второй иностранный немецкий",
    "Второй иностранный французский",
    "География",
    "ИЗО",
    "Информатика",
    "История",
    "Литература",
    "Математика",
    "Музыка",
    "Немецкий язык",
    "ОБЗР",
    "Обществознание",
    "Русский язык",
    "Труд технология",
    "Физика",
    "Физическая культура",
    "Французский язык",
    "Химия",
  ],
  soo: [
    "Английский язык",
    "Биология",
    "Второй иностранный английский",
    "Второй иностранный испанский",
    "Второй иностранный китайский",
    "Второй иностранный немецкий",
    "Второй иностранный французский",
    "География",
    "Информатика",
    "История",
    "Литература",
    "Математика",
    "Немецкий язык",
    "ОБЗР",
    "Обществознание",
    "Русский язык",
    "Физика",
    "Физическая культура",
    "Химия",
  ],
};

const ALL_SUBJECTS = Array.from(new Set(Object.values(SUBJECTS_BY_LEVEL).flat())).sort((first, second) =>
  first.localeCompare(second, "ru"),
);

function App() {
  const [mode, setMode] = useState<Mode>("chat");
  const [stats, setStats] = useState<CorpusStats | null>(null);
  const [healthy, setHealthy] = useState<boolean | null>(null);
  const [filters, setFilters] = useState<ChatFilters>({});

  useEffect(() => {
    void getHealth().then(setHealthy);
    void getStats().then(setStats).catch(() => setStats(null));
  }, []);

  const availableSubjects = filters.level ? SUBJECTS_BY_LEVEL[filters.level] ?? ALL_SUBJECTS : ALL_SUBJECTS;

  useEffect(() => {
    if (filters.subject && !availableSubjects.includes(filters.subject)) {
      setFilters((current) => ({ ...current, subject: undefined }));
    }
  }, [availableSubjects, filters.subject]);

  return (
    <main className="h-screen overflow-hidden bg-[#fbf8ff] p-3 text-slate-950 md:p-4">
      <div className="mx-auto flex h-full max-w-[1480px] flex-col gap-3 overflow-hidden">
        <header className="flex h-[64px] shrink-0 items-center justify-between gap-4 rounded-[24px] bg-white/90 px-4 py-2 shadow-[0_14px_44px_rgba(118,82,180,0.09)] ring-1 ring-violet-100/70 backdrop-blur">
          <div className="flex min-w-0 shrink items-center gap-3">
            <span className="hidden rounded-full bg-violet-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-violet-500 sm:inline-flex">
              ИИ-база
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold leading-6 tracking-tight text-slate-950">
              Агент работы с документами
              </h1>
              <p className="truncate text-xs text-slate-500">ФГОС, ФРП, СанПиН и профстандарты</p>
            </div>
          </div>

          <div className="hidden min-w-0 shrink-0 items-center gap-2 rounded-[20px] bg-slate-50 px-2.5 py-1.5 ring-1 ring-slate-100 lg:flex">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Database className="h-4 w-4" />
            </div>
            <span className="whitespace-nowrap text-xs font-semibold text-slate-700">База</span>
            <HeaderMetric label="ФРП" value={stats?.frp ?? "—"} />
            <HeaderMetric label="ФГОС" value={stats?.fgos ?? "—"} />
            <HeaderMetric label="СанПиН" value={stats?.sanpin ?? "—"} />
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-100">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  healthy === null && "bg-amber-400",
                  healthy === true && "bg-emerald-500",
                  healthy === false && "bg-rose-500",
                )}
              />
              {healthy === null ? "Проверка" : healthy ? "Готова" : "Ошибка"}
            </span>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col overflow-y-auto rounded-[26px] bg-gradient-to-b from-[#f3eaff] via-[#f8f3ff] to-[#ede5ff] p-3 shadow-[0_20px_64px_rgba(111,76,255,0.14)] ring-1 ring-white/80">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-500">Фильтры</p>
                <h2 className="text-base font-semibold text-slate-950">Параметры запроса</h2>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-violet-600 shadow-sm ring-1 ring-violet-100">
                <Boxes className="h-4 w-4" />
              </div>
            </div>

            <PanelCard>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-950">Фильтры</p>
                  <p className="mt-1 text-xs text-slate-500">Для контекста поиска</p>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                <FilterSelect
                  label="Тип документа"
                  options={[
                    { label: "Все документы", value: "" },
                    { label: "ФРП", value: "frp" },
                    { label: "ФГОС", value: "fgos" },
                    { label: "СанПиН", value: "sanpin" },
                    { label: "Профстандарт", value: "profstandart" },
                  ]}
                  value={filters.document_type ?? ""}
                  onChange={(value) => setFilters((current) => ({ ...current, document_type: value || undefined }))}
                />
                <FilterSelect
                  label="Уровень образования"
                  options={[
                    { label: "Любой", value: "" },
                    { label: "НОО", value: "noo" },
                    { label: "ООО", value: "ooo" },
                    { label: "СОО", value: "soo" },
                  ]}
                  value={filters.level ?? ""}
                  onChange={(value) => setFilters((current) => ({ ...current, level: value || undefined }))}
                />
                <FilterSelect
                  label="Предмет"
                  options={[
                    { label: "Любой", value: "" },
                    ...availableSubjects.map((subject) => ({ label: subject, value: subject })),
                  ]}
                  value={filters.subject ?? ""}
                  onChange={(value) => setFilters((current) => ({ ...current, subject: value || undefined }))}
                />
              </div>
            </PanelCard>

          </aside>

          <section className="flex min-w-0 flex-col overflow-hidden rounded-[26px] bg-white shadow-[0_20px_60px_rgba(93,89,135,0.09)] ring-1 ring-slate-100">
            <div className="flex h-[72px] shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-violet-500">
                  {mode === "chat" ? "Материалы" : "Проверка"}
                </p>
                <h2 className="mt-0.5 text-base font-semibold text-slate-950">
                  {mode === "chat" ? "Поиск нормативных ответов" : "Проверка соответствия"}
                </h2>
                <p className="mt-0.5 truncate text-xs text-slate-500">Фильтры: {formatFilters(filters)}</p>
              </div>

              <div className="flex shrink-0 rounded-2xl bg-slate-100 p-1 shadow-inner">
                <Button className="h-9 rounded-xl px-3" variant={mode === "chat" ? "outline" : "ghost"} onClick={() => setMode("chat")}>
                  <BookOpen className="h-4 w-4" />
                  Чат
                </Button>
                <Button className="h-9 rounded-xl px-3" variant={mode === "check" ? "outline" : "ghost"} onClick={() => setMode("check")}>
                  <ClipboardCheck className="h-4 w-4" />
                  Проверка
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden bg-[#fbfbfe] p-4">
              {mode === "chat" ? <ChatPanel filters={filters} /> : <CheckPanel />}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function PanelCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Card className={cn("border-0 bg-white/90 p-3 shadow-[0_12px_34px_rgba(111,76,255,0.07)] ring-1 ring-white/80", className)}>
      {children}
    </Card>
  );
}

function HeaderMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="min-w-12 rounded-xl bg-white px-2.5 py-1 text-center ring-1 ring-slate-100">
      <p className="text-sm font-semibold leading-4 text-slate-950">{value}</p>
      <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  );
}

function formatFilters(filters: ChatFilters) {
  const parts = [
    filters.document_type ? documentTypeLabel(filters.document_type) : "тип не выбран",
    filters.level ? levelLabel(filters.level) : "уровень не выбран",
    filters.subject || "предмет не выбран",
  ];
  return parts.join(" • ");
}

function documentTypeLabel(value: string) {
  const labels: Record<string, string> = {
    frp: "ФРП",
    fgos: "ФГОС",
    sanpin: "СанПиН",
    profstandart: "Профстандарт",
  };
  return labels[value] ?? value;
}

function levelLabel(value: string) {
  const labels: Record<string, string> = {
    noo: "НОО",
    ooo: "ООО",
    soo: "СОО",
  };
  return labels[value] ?? value;
}

function FilterSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <GraduationCap className="h-3.5 w-3.5 text-violet-400" />
        {label}
      </span>
      <select
        className="h-10 w-full rounded-2xl border-0 bg-slate-50 px-3 text-sm text-slate-800 outline-none ring-1 ring-slate-100 transition focus:bg-white focus:ring-4 focus:ring-violet-100"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value || option.label} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default App;
