import { BookOpen, ClipboardCheck } from "lucide-react";
import { useState } from "react";
import { ChatPanel } from "./components/ChatPanel";
import { CheckPanel } from "./components/CheckPanel";

type Mode = "chat" | "check";

function App() {
  const [mode, setMode] = useState<Mode>("chat");

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#fbf8ff] via-white to-[#eef9f7] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 rounded-[32px] border border-white/70 bg-white/80 p-5 shadow-soft backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brand-600">AI · нормативная база</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Агент работы с документами</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              RAG-система отвечает только по локальной базе ФРП, ФГОС, СанПиН и профстандарта с цитатами и
              страницами источников.
            </p>
          </div>
          <div className="flex rounded-2xl bg-slate-100 p-1">
            <button
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                mode === "chat" ? "bg-white text-brand-700 shadow-sm" : "text-slate-500"
              }`}
              onClick={() => setMode("chat")}
              type="button"
            >
              <BookOpen className="h-4 w-4" />
              Чат
            </button>
            <button
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                mode === "check" ? "bg-white text-brand-700 shadow-sm" : "text-slate-500"
              }`}
              onClick={() => setMode("check")}
              type="button"
            >
              <ClipboardCheck className="h-4 w-4" />
              Проверка
            </button>
          </div>
        </header>
        {mode === "chat" ? <ChatPanel /> : <CheckPanel />}
      </div>
    </main>
  );
}

export default App;
