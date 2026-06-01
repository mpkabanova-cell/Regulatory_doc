import { BookOpen, Bot, ClipboardCheck, Database, FileText, ShieldCheck } from "lucide-react";
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
    <main className="min-h-screen bg-slate-100 px-4 py-5 text-slate-950 sm:px-6">
      <div className="mx-auto flex h-[calc(100vh-40px)] max-w-[1360px] gap-4">
        <aside className="hidden w-72 shrink-0 flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:flex">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-950">Regulatory AI</p>
              <p className="text-xs text-slate-500">Нормативная база РФ</p>
            </div>
          </div>

          <nav className="mt-6 space-y-2">
            <NavButton active={mode === "chat"} icon={<BookOpen className="h-4 w-4" />} onClick={() => setMode("chat")}>
              Чат
            </NavButton>
            <NavButton
              active={mode === "check"}
              icon={<ClipboardCheck className="h-4 w-4" />}
              onClick={() => setMode("check")}
            >
              Проверка документов
            </NavButton>
          </nav>

          <Card className="mt-auto p-4">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-full",
                  healthy === null && "bg-amber-400",
                  healthy === true && "bg-emerald-500",
                  healthy === false && "bg-rose-500",
                )}
              />
              <p className="text-sm font-medium text-slate-800">
                {healthy === null ? "Проверка API" : healthy ? "Backend доступен" : "Backend недоступен"}
              </p>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Ответы строятся только по локальному ChromaDB индексу и цитируемым источникам.
            </p>
          </Card>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-sm">
          <header className="border-b border-slate-200 bg-white px-5 py-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-violet-200 bg-violet-50 text-violet-700">
                    <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                    RAG
                  </Badge>
                  <Badge>локальная база</Badge>
                </div>
                <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
                  Агент нормативных документов
                </h1>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                  Чат и проверка материалов по ФРП, ФГОС, СанПиН и профстандарту с цитатами, страницами и источниками.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:min-w-[360px]">
                <Stat icon={<Database className="h-4 w-4" />} label="Документов" value={stats?.documents ?? "—"} />
                <Stat icon={<FileText className="h-4 w-4" />} label="ФРП" value={stats?.frp ?? "—"} />
                <Stat icon={<ShieldCheck className="h-4 w-4" />} label="ФГОС" value={stats?.fgos ?? "—"} />
              </div>
            </div>

            <div className="mt-4 flex rounded-2xl bg-slate-100 p-1 lg:hidden">
              <Button className="flex-1" variant={mode === "chat" ? "outline" : "ghost"} onClick={() => setMode("chat")}>
                Чат
              </Button>
              <Button className="flex-1" variant={mode === "check" ? "outline" : "ghost"} onClick={() => setMode("check")}>
                Проверка
              </Button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-hidden p-4">
            {mode === "chat" ? <ChatPanel /> : <CheckPanel />}
          </div>
        </section>
      </div>
    </main>
  );
}

function NavButton({
  active,
  children,
  icon,
  onClick,
}: {
  active: boolean;
  children: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition",
        active ? "bg-slate-950 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
      )}
      onClick={onClick}
      type="button"
    >
      {icon}
      {children}
    </button>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}

export default App;
