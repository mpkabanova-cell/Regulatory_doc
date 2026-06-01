import {
  BookOpen,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileText,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { ChatPanel } from "./components/ChatPanel";
import { CheckPanel } from "./components/CheckPanel";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Card } from "./components/ui/card";
import { getHealth, getStats } from "./lib/api";
import { cn } from "./lib/utils";
import type { CorpusStats } from "./types";

type Mode = "chat" | "check";

function App() {
  const [mode, setMode] = useState<Mode>("chat");
  const [stats, setStats] = useState<CorpusStats | null>(null);
  const [healthy, setHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    void getHealth().then(setHealthy);
    void getStats().then(setStats).catch(() => setStats(null));
  }, []);

  return (
    <main className="min-h-screen bg-[#fbf8ff] p-4 text-slate-950 md:p-6">
      <div className="mx-auto flex min-h-[calc(100vh-32px)] max-w-[1480px] flex-col gap-4 md:min-h-[calc(100vh-48px)]">
        <header className="flex min-h-[72px] shrink-0 items-center justify-between rounded-[28px] bg-white/85 px-5 py-3 shadow-[0_18px_60px_rgba(118,82,180,0.10)] ring-1 ring-violet-100/70 backdrop-blur">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-violet-500">AI • Нормативная база</p>
            <h1 className="mt-1 truncate text-xl font-semibold tracking-tight text-slate-950 md:text-2xl">
              Агент работы с документами
            </h1>
            <p className="hidden text-sm text-slate-500 md:block">Поиск по ФГОС, ФРП, СанПиН и профстандартам</p>
          </div>

          <div className="hidden items-center gap-2 lg:flex">
            <HeaderStat label="документов" value={stats?.documents ?? "—"} />
            <HeaderStat label="ФРП" value={stats?.frp ?? "—"} />
            <HeaderStat label="ФГОС" value={stats?.fgos ?? "—"} />
            <HeaderStat
              label="база"
              value={healthy === null ? "проверка" : healthy ? "готова" : "ошибка"}
              tone={healthy === false ? "danger" : "success"}
            />
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col rounded-[30px] bg-gradient-to-b from-[#f3eaff] via-[#f8f3ff] to-[#ede5ff] p-4 shadow-[0_24px_80px_rgba(111,76,255,0.16)] ring-1 ring-white/80">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-500">Шаги работы</p>
                <h2 className="text-lg font-semibold text-slate-950">Параметры запроса</h2>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-sm ring-1 ring-violet-100">
                <Boxes className="h-4 w-4" />
              </div>
            </div>

            <PanelCard>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-950">Режим работы</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Выберите сценарий</p>
                </div>
              </div>
              <div className="mt-4 grid gap-2">
                <ModeButton
                  active={mode === "chat"}
                  icon={<BookOpen className="h-4 w-4" />}
                  label="Чат с источниками"
                  onClick={() => setMode("chat")}
                />
                <ModeButton
                  active={mode === "check"}
                  icon={<ClipboardCheck className="h-4 w-4" />}
                  label="Проверка документов"
                  onClick={() => setMode("check")}
                />
              </div>
            </PanelCard>

            <PanelCard className="mt-3">
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
                <FilterSelect label="Тип документа" options={["Все документы", "ФРП", "ФГОС", "СанПиН", "Профстандарт"]} />
                <FilterSelect label="Уровень образования" options={["Любой", "НОО", "ООО", "СОО"]} />
                <FilterSelect label="Предмет" options={["Любой", "Информатика", "Математика", "Русский язык", "История"]} />
              </div>
            </PanelCard>

            <PanelCard className="mt-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-950">Локальная нормативная база</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">ChromaDB индекс</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <Stat label="ФРП" value={stats?.frp ?? "—"} />
                <Stat label="ФГОС" value={stats?.fgos ?? "—"} />
                <Stat label="СанПиН" value={stats?.sanpin ?? "—"} />
              </div>
              <div className="mt-3 flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
                <span className="text-xs font-medium text-slate-500">Статус</span>
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <span
                    className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      healthy === null && "bg-amber-400",
                      healthy === true && "bg-emerald-500",
                      healthy === false && "bg-rose-500",
                    )}
                  />
                  {healthy === null ? "проверка" : healthy ? "готова" : "ошибка"}
                </span>
              </div>
            </PanelCard>

            <PanelCard className="mt-3">
              <p className="text-sm font-semibold text-slate-950">Быстрые запросы</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["План урока", "Требования ФГОС", "Результаты обучения", "КТП", "СанПиН", "Внеурочная деятельность"].map(
                  (tag) => (
                    <Badge
                      className="cursor-pointer border-violet-100 bg-violet-50 text-violet-700 transition hover:bg-violet-100"
                      key={tag}
                    >
                      {tag}
                    </Badge>
                  ),
                )}
              </div>
            </PanelCard>

            <Button className="mt-4 h-14 rounded-[22px] bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-[0_18px_38px_rgba(124,58,237,0.28)] hover:from-violet-700 hover:to-indigo-700">
              <CheckCircle2 className="h-4 w-4" />
              {mode === "chat" ? "Задать вопрос базе" : "Проверить материал"}
            </Button>
          </aside>

          <section className="flex min-w-0 flex-col overflow-hidden rounded-[30px] bg-white shadow-[0_22px_70px_rgba(93,89,135,0.10)] ring-1 ring-slate-100">
            <div className="flex shrink-0 flex-col gap-3 border-b border-slate-100 px-6 py-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-violet-500">
                  {mode === "chat" ? "Материалы" : "Проверка"}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  {mode === "chat" ? "Поиск нормативных ответов" : "Проверка соответствия"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">Фильтры: Все документы • Любой уровень • Любой предмет</p>
              </div>

              <div className="flex rounded-[20px] bg-slate-100 p-1 shadow-inner">
                <Button className="rounded-xl" variant={mode === "chat" ? "outline" : "ghost"} onClick={() => setMode("chat")}>
                  <BookOpen className="h-4 w-4" />
                  Чат
                </Button>
                <Button className="rounded-xl" variant={mode === "check" ? "outline" : "ghost"} onClick={() => setMode("check")}>
                  <ClipboardCheck className="h-4 w-4" />
                  Проверка
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden bg-[#fbfbfe] p-5">
              {mode === "chat" ? <ChatPanel /> : <CheckPanel />}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function PanelCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Card className={cn("border-0 bg-white/90 p-4 shadow-[0_16px_42px_rgba(111,76,255,0.08)] ring-1 ring-white/80", className)}>
      {children}
    </Card>
  );
}

function ModeButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition",
        active ? "bg-violet-600 text-white shadow-lg shadow-violet-100" : "bg-slate-50 text-slate-600 hover:bg-violet-50 hover:text-violet-700",
      )}
      onClick={onClick}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-2 text-center ring-1 ring-slate-100">
      <p className="text-lg font-semibold text-slate-950">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium text-slate-500">{label}</p>
    </div>
  );
}

function HeaderStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number | string;
  tone?: "default" | "success" | "danger";
}) {
  return (
    <div
      className={cn(
        "min-w-24 rounded-2xl px-3 py-2 text-center shadow-sm ring-1",
        tone === "default" && "bg-white ring-slate-100",
        tone === "success" && "bg-emerald-50 ring-emerald-100",
        tone === "danger" && "bg-rose-50 ring-rose-100",
      )}
    >
      <p className="text-sm font-semibold text-slate-950">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium text-slate-500">{label}</p>
    </div>
  );
}

function FilterSelect({ label, options }: { label: string; options: string[] }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <GraduationCap className="h-3.5 w-3.5 text-violet-400" />
        {label}
      </span>
      <select className="h-10 w-full rounded-2xl border-0 bg-slate-50 px-3 text-sm text-slate-800 outline-none ring-1 ring-slate-100 transition focus:bg-white focus:ring-4 focus:ring-violet-100">
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

export default App;
