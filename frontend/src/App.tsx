import {
  BookOpen,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileText,
  GraduationCap,
  Menu,
  PanelLeft,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X,
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    void getHealth().then(setHealthy);
    void getStats().then(setStats).catch(() => setStats(null));
  }, []);

  return (
    <main className="min-h-screen bg-[#f7f3ff] p-4 text-slate-950 md:p-6">
      <div className="mx-auto flex h-[calc(100vh-32px)] max-w-[1600px] flex-col gap-5 md:h-[calc(100vh-48px)]">
        <header className="flex min-h-[84px] shrink-0 items-center justify-between rounded-[28px] border border-white/80 bg-white/75 px-4 py-3 shadow-sm backdrop-blur md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button className="lg:hidden" size="icon" variant="outline" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-violet-500">
                AI • Нормативная база
              </p>
              <h1 className="mt-1 truncate text-xl font-semibold tracking-tight text-slate-950 md:text-2xl">
                Агент работы с документами
              </h1>
              <p className="hidden text-sm text-slate-500 md:block">
                Поиск по ФГОС, ФРП, СанПиН и профстандартам
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-2 xl:flex">
            <HeaderStat label="документов" value={stats?.documents ?? "—"} />
            <HeaderStat label="ФРП" value={stats?.frp ?? "—"} />
            <HeaderStat label="ФГОС" value={stats?.fgos ?? "—"} />
            <HeaderStat
              label="индекс"
              value={healthy === null ? "проверка" : healthy ? "готов" : "ошибка"}
              tone={healthy === false ? "danger" : "success"}
            />
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-sm lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
          <aside
            className={cn(
              "fixed inset-y-4 left-4 z-50 flex w-[min(340px,calc(100vw-32px))] flex-col overflow-hidden rounded-[30px] border border-violet-100 bg-violet-50/90 p-4 shadow-[0_24px_80px_rgba(109,40,217,0.22)] transition-transform lg:sticky lg:top-6 lg:z-auto lg:h-full lg:w-auto lg:translate-x-0 lg:bg-violet-50/75 lg:shadow-[0_24px_80px_rgba(109,40,217,0.14)]",
              sidebarOpen ? "translate-x-0" : "-translate-x-[calc(100%+32px)]",
            )}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-violet-500">Шаги работы</p>
                <h2 className="text-lg font-semibold text-slate-950">Параметры запроса</h2>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-sm">
                <PanelLeft className="hidden h-4 w-4 lg:block" />
                <button className="lg:hidden" onClick={() => setSidebarOpen(false)} type="button">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <Card className="border-white/80 bg-white/90 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-950">Режим работы</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Выберите сценарий работы с нормативной базой.</p>
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
            </Card>

            <Card className="mt-3 border-white/80 bg-white/90 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                  <SlidersHorizontal className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-950">Фильтры</p>
                  <p className="mt-1 text-xs text-slate-500">Для контекста запроса</p>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                <FilterSelect label="Тип документа" options={["Все документы", "ФРП", "ФГОС", "СанПиН", "Профстандарт"]} />
                <FilterSelect label="Уровень образования" options={["Любой", "НОО", "ООО", "СОО"]} />
                <FilterSelect label="Предмет" options={["Любой", "Информатика", "Математика", "Русский язык", "История"]} />
              </div>
            </Card>

            <Card className="mt-3 border-white/80 bg-white/90 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-950">Нормативная база</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Локальный индекс ChromaDB</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <Stat label="Док." value={stats?.documents ?? "—"} />
                <Stat label="ФРП" value={stats?.frp ?? "—"} />
                <Stat label="ФГОС" value={stats?.fgos ?? "—"} />
              </div>
              <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
                <span className="text-xs font-medium text-slate-500">Статус API</span>
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <span
                    className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      healthy === null && "bg-amber-400",
                      healthy === true && "bg-emerald-500",
                      healthy === false && "bg-rose-500",
                    )}
                  />
                  {healthy === null ? "проверка" : healthy ? "доступен" : "недоступен"}
                </span>
              </div>
            </Card>

            <Card className="mt-3 border-white/80 bg-white/90 p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-950">Быстрые темы</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["План урока", "Требования ФГОС", "Результаты обучения", "КТП", "СанПиН", "Внеурочная деятельность"].map((tag) => (
                  <Badge className="cursor-pointer border-violet-100 bg-violet-50 text-violet-700 transition hover:bg-violet-100" key={tag}>
                    {tag}
                  </Badge>
                ))}
              </div>
            </Card>

            <Button className="mt-auto h-12 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-200 hover:from-violet-700 hover:to-indigo-700">
              <CheckCircle2 className="h-4 w-4" />
              {mode === "chat" ? "Задать вопрос базе" : "Проверить материал"}
            </Button>
          </aside>

          <section className="flex min-w-0 flex-col overflow-hidden rounded-[30px] border border-slate-200/80 bg-white shadow-sm">
            <div className="flex shrink-0 flex-col gap-3 border-b border-slate-100 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-500">
                  {mode === "chat" ? "Материалы" : "Проверка"}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  {mode === "chat" ? "Поиск нормативных ответов" : "Проверка соответствия"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Фильтры: Все документы • Любой уровень • Любой предмет
                </p>
              </div>
              <div className="flex rounded-2xl bg-slate-100 p-1">
                <Button
                  className="rounded-xl"
                  variant={mode === "chat" ? "outline" : "ghost"}
                  onClick={() => setMode("chat")}
                >
                  <BookOpen className="h-4 w-4" />
                  Чат
                </Button>
                <Button
                  className="rounded-xl"
                  variant={mode === "check" ? "outline" : "ghost"}
                  onClick={() => setMode("check")}
                >
                  <ClipboardCheck className="h-4 w-4" />
                  Проверка
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden bg-slate-50/60 p-4">
              {mode === "chat" ? <ChatPanel onOpenCheck={() => setMode("check")} /> : <CheckPanel />}
            </div>
          </section>
        </div>
      </div>
    </main>
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
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-center">
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
        "min-w-24 rounded-2xl border px-3 py-2 text-center shadow-sm",
        tone === "default" && "border-slate-200 bg-white",
        tone === "success" && "border-emerald-100 bg-emerald-50",
        tone === "danger" && "border-rose-100 bg-rose-50",
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
      <select className="h-10 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100">
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

export default App;
