import { FileSearch, MessageSquareText, Paperclip, Search, SendHorizontal, Sparkles } from "lucide-react";
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { sendChat } from "../lib/api";
import type { Message } from "../types";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Textarea } from "./ui/textarea";
import { SourceCard } from "./SourceCard";

type ChatPanelProps = {
  onOpenCheck?: () => void;
};

export function ChatPanel({ onOpenCheck }: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
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
  const [error, setError] = useState("");

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await submitMessage();
  }

  async function submitMessage() {
    const message = input.trim();
    if (!message || loading) return;
    setInput("");
    setLoading(true);
    setError("");
    setMessages((current) => [...current, { role: "user", content: message }]);
    try {
      const response = await sendChat(message);
      setMessages((current) => [
        ...current,
        { role: "assistant", content: response.answer, sources: response.sources },
      ]);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Не удалось получить ответ. Проверьте, что backend запущен на http://localhost:8000.";
      setError(errorMessage);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: `Не удалось получить ответ.\n\n${errorMessage}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submitMessage();
    }
  }

  const latestSources = [...messages].reverse().find((message) => message.sources?.length)?.sources ?? [];

  return (
    <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
      <Card className="flex min-h-0 flex-col overflow-hidden border-slate-100 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-950">План ответа</p>
              <p className="text-xs text-slate-500">Поиск по локальной нормативной базе с цитированием</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm">
                <MessageSquareText className="h-3.5 w-3.5 text-violet-500" />
                Чат
              </span>
              <span className="inline-flex h-9 items-center gap-2 rounded-full bg-violet-600 px-3 text-xs font-semibold text-white shadow-lg shadow-violet-100">
                <Search className="h-3.5 w-3.5" />
                Поиск источников
              </span>
              <button
                className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-violet-200 hover:text-violet-700"
                onClick={onOpenCheck}
                type="button"
              >
                <FileSearch className="h-3.5 w-3.5" />
                Проверить документ
              </button>
            </div>
          </div>
        </div>

        <div ref={scrollRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-[#fbfbfe] px-4 py-5">
          {messages.map((message, index) => (
            <div
              className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              key={`${message.role}-${index}`}
            >
              {message.role === "assistant" && (
                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700 shadow-sm">
                  <Sparkles className="h-4 w-4" />
                </div>
              )}
              <div
                className={`max-w-[84%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm ${
                  message.role === "user"
                    ? "bg-violet-600 text-white shadow-violet-100"
                    : "border border-slate-100 bg-white text-slate-800"
                }`}
              >
                <MarkdownMessage content={message.content} dark={message.role === "user"} />
                {!!message.sources?.length && (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                    {message.sources.slice(0, 4).map((source, sourceIndex) => (
                      <span
                        className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                        key={`${source.source_path}-${sourceIndex}`}
                      >
                        [{sourceIndex + 1}] {source.document}, стр. {source.page || "-"}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                <Sparkles className="h-4 w-4 animate-pulse" />
              </div>
              <div className="rounded-3xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                Ищу релевантные фрагменты и формирую ответ с источниками...
              </div>
            </div>
          )}
        </div>

        <form className="sticky bottom-0 border-t border-slate-100 bg-white p-4" onSubmit={handleSubmit}>
          {error && (
            <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}
          <div className="flex items-end gap-3">
            <Button
              aria-label="Загрузить документ"
              title="Для проверки документов перейдите во вкладку Проверка документов"
              type="button"
              variant="outline"
              size="icon"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Textarea
              className="min-h-14 flex-1 rounded-[22px] border-slate-200 py-3 shadow-none"
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Спросите о ФГОС, ФРП, СанПиН или требованиях к программе..."
              value={input}
            />
            <Button
              className="bg-violet-600 text-white shadow-lg shadow-violet-100 hover:bg-violet-700"
              disabled={!input.trim() || loading}
              type="submit"
              size="icon"
            >
              <SendHorizontal className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Enter отправляет, Shift+Enter переносит строку. Первый ответ может занять 15–30 секунд.
          </p>
        </form>
      </Card>

      <Card className="hidden min-h-0 flex-col overflow-hidden border-slate-100 bg-white xl:flex">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-950">Подобранные источники</p>
              <p className="mt-1 text-xs text-slate-500">Показаны релевантные ссылки, если они доступны</p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500">
              {latestSources.length ? `Показано: ${latestSources.length}` : "Пусто"}
            </span>
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {latestSources.length ? (
            latestSources.map((source, index) => (
              <SourceCard index={index + 1} key={`${source.source_path}-${index}`} source={source} />
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-500">
              После ответа здесь появятся страницы, цитаты и пути к документам.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

function MarkdownMessage({ content, dark = false }: { content: string; dark?: boolean }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
        ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
        code: ({ children }) => (
          <code
            className={
              dark
                ? "rounded bg-white/15 px-1.5 py-0.5 text-[0.85em] text-white"
                : "rounded bg-slate-100 px-1.5 py-0.5 text-[0.85em] text-slate-900"
            }
          >
            {children}
          </code>
        ),
        pre: ({ children }) => (
          <pre className="my-3 overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
            {children}
          </pre>
        ),
        blockquote: ({ children }) => (
          <blockquote className="my-3 border-l-4 border-violet-200 pl-3 text-slate-600">{children}</blockquote>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
