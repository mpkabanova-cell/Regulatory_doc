import { SendHorizontal } from "lucide-react";
import { FormEvent, useState } from "react";
import { sendChat } from "../lib/api";
import type { Message } from "../types";
import { SourceCard } from "./SourceCard";

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Задайте вопрос по нормативной базе. Я отвечу только при наличии подтверждения в загруженных документах.",
      sources: [],
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const message = input.trim();
    if (!message || loading) return;
    setInput("");
    setLoading(true);
    setMessages((current) => [...current, { role: "user", content: message }]);
    try {
      const response = await sendChat(message);
      setMessages((current) => [
        ...current,
        { role: "assistant", content: response.answer, sources: response.sources },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        { role: "assistant", content: error instanceof Error ? error.message : "Ошибка запроса." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const latestSources = [...messages].reverse().find((message) => message.sources?.length)?.sources ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="rounded-[28px] border border-white/70 bg-white/90 p-4 shadow-soft">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brand-600">Нормативный чат</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">Ответы с источниками</h2>
        </div>
        <div className="h-[520px] space-y-4 overflow-y-auto rounded-3xl bg-slate-50/80 p-4">
          {messages.map((message, index) => (
            <div
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              key={`${message.role}-${index}`}
            >
              <div
                className={`max-w-[82%] rounded-3xl px-4 py-3 text-sm leading-6 ${
                  message.role === "user"
                    ? "bg-brand-600 text-white"
                    : "border border-slate-200 bg-white text-slate-800"
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
          {loading && <div className="text-sm text-slate-500">Ищу нормативные основания...</div>}
        </div>
        <form className="mt-4 flex gap-3" onSubmit={handleSubmit}>
          <input
            className="min-h-12 flex-1 rounded-2xl border border-slate-200 bg-white px-4 outline-none ring-brand-200 transition focus:ring-4"
            onChange={(event) => setInput(event.target.value)}
            placeholder="Например: какие результаты по информатике в 7 классе?"
            value={input}
          />
          <button
            className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-brand-600 px-5 font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 disabled:opacity-60"
            disabled={loading}
            type="submit"
          >
            <SendHorizontal className="h-4 w-4" />
            Спросить
          </button>
        </form>
      </section>

      <aside className="rounded-[28px] border border-white/70 bg-white/80 p-4 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Источники</p>
        <h3 className="mt-2 text-xl font-semibold text-slate-950">Найденные документы</h3>
        <div className="mt-4 space-y-3">
          {latestSources.length ? (
            latestSources.map((source, index) => <SourceCard index={index + 1} key={`${source.source_path}-${index}`} source={source} />)
          ) : (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
              После ответа здесь появятся страницы, цитаты и пути к документам.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
