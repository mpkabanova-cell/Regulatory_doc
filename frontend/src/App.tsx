import {
  BookOpen,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileText,
  PanelLeft,
  ShieldCheck,
  Sparkles,
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
    <main className="min-h-screen bg-[#f7f3ff] px-4 py-4 text-slate-950 sm:px-6">
      <div className="mx-auto flex h-[calc(100vh-32px)] max-w-[1440px] flex-col gap-4">
        <header className="flex shrink-0 items-center justify-between rounded-[28px] border border-white/80 bg-white/75 px-4 py-3 shadow-sm backdrop-blur md:px-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-violet-500">AI-МАСТЕР ДОКУМЕНТОВ</p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-950 md:text-2xl">
              Агент нормативной базы
            </h1>
          </div>
          <Button className="hidden rounded-full bg-violet-600 px-5 text-white shadow-violet-200 hover:bg-violet-700 sm:inline-flex">
            <Sparkles className="h-4 w-4" />
            Ответ по базе за 1 минуту
          </Button>
        </header>

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col overflow-hidden rounded-[30px] border border-violet-100 bg-violet-50/75 p-4 shadow-[0_24px_80px_rgba(109,40,217,0.14)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-violet-500">Шаги работы</p>
                <h2 className="text-lg font-semibold text-slate-950">Параметры запроса</h2>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-sm">
                <PanelLeft className="h-4 w-4" />
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
                {["ФГОС", "ФРП", "СанПиН", "Информатика", "План урока"].map((tag) => (
                  <Badge className="border-violet-100 bg-violet-50 text-violet-700" key={tag}>
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

export default App;
