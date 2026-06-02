import { SendHorizontal, Sparkles } from "lucide-react";
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { sendChat } from "../lib/api";
import type { ChatFilters, Message } from "../types";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Textarea } from "./ui/textarea";
import { SourceCard } from "./SourceCard";

const SUGGESTED_PROMPTS = [
  "Какие результаты по информатике в 7 классе?",
  "Какие требования ФГОС ООО к рабочей программе?",
  "Что проверить в плане урока?",
  "Какие ограничения СанПиН важны для школы?",
];

type ChatPanelProps = {
  filters: ChatFilters;
};

export function ChatPanel({ filters }: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const filtersRef = useRef(filters);
  const messagesRef = useRef<Message[]>([]);
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
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    if (loading) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      return;
    }

    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "assistant") {
      const assistantMessages = container.querySelectorAll<HTMLElement>("[data-message-role='assistant']");
      const latestAssistantMessage = assistantMessages[assistantMessages.length - 1];
      if (latestAssistantMessage) {
        window.requestAnimationFrame(() => {
          const containerRect = container.getBoundingClientRect();
          const messageRect = latestAssistantMessage.getBoundingClientRect();
          const top = container.scrollTop + messageRect.top - containerRect.top - 12;
          container.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
        });
      }
      return;
    }

    if (lastMessage?.role === "user") {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }
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
      const response = await sendChat(message, filtersRef.current, messagesRef.current);
      setMessages((current) => [
        ...current,
        { role: "assistant", content: response.answer, sources: response.sources },
      ]);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Не удалось получить ответ. Проверьте, что сервер запущен на http://localhost:8000.";
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

  function handleInput(value: string) {
    setInput(value);
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 144)}px`;
  }

  return (
    <div className="h-full min-h-0">
      <Card className="flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border-slate-100 bg-white shadow-[0_18px_54px_rgba(93,89,135,0.08)]">
        <div ref={scrollRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-gradient-to-b from-[#fcfbff] to-[#f8fafc] px-4 py-5">
          {messages.map((message, index) => (
            <div data-message-role={message.role} key={`${message.role}-${index}`}>
              <div className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                {message.role === "assistant" && (
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700 shadow-sm">
                    <Sparkles className="h-4 w-4" />
                  </div>
                )}
                <div
                  className={`max-w-[86%] rounded-3xl px-4 py-3 text-sm leading-7 shadow-sm ${
                    message.role === "user"
                    ? "bg-gradient-to-r from-[#8b35f6] to-[#563df2] text-white shadow-[0_12px_28px_rgba(124,58,237,0.22)]"
                      : "border border-slate-100 bg-white text-slate-800 shadow-[0_12px_34px_rgba(93,89,135,0.08)] md:px-5 md:py-4"
                  }`}
                >
                  <MarkdownMessage content={message.content} dark={message.role === "user"} />
                </div>
              </div>
              {message.role === "assistant" && !!message.sources?.length && (
                <div className="ml-11 mt-3 max-w-[calc(100%-2.75rem)]">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Источники</p>
                  <div className="space-y-2">
                    {message.sources.slice(0, 4).map((source, sourceIndex) => (
                      <SourceCard
                        compact
                        index={sourceIndex + 1}
                        key={`${source.source_path}-${sourceIndex}`}
                        source={source}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                <Sparkles className="h-4 w-4 animate-pulse" />
              </div>
              <div className="rounded-3xl border border-violet-100 bg-white px-4 py-3 text-sm text-slate-600 shadow-[0_12px_34px_rgba(93,89,135,0.08)]">
                Ищу релевантные фрагменты и формирую ответ с источниками...
              </div>
            </div>
          )}
        </div>

        <form className="shrink-0 border-t border-slate-100 bg-white/95 p-4 backdrop-blur" onSubmit={handleSubmit}>
          {error && (
            <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}
          {messages.length === 1 && !loading && (
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  className="shrink-0 rounded-full border border-violet-100 bg-[#fbf8ff] px-3 py-2 text-left text-xs font-medium text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                  key={prompt}
                  onClick={() => handleInput(prompt)}
                  type="button"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-end gap-3">
            <Textarea
              ref={textareaRef}
              className="max-h-36 min-h-14 flex-1 rounded-[28px] border-violet-100 bg-[#fbf8ff] py-3 shadow-[0_12px_30px_rgba(111,76,255,0.08)]"
              onChange={(event) => handleInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Спросите о ФГОС, ФРП, СанПиН или требованиях к программе..."
              value={input}
            />
            <Button
              className="bg-gradient-to-r from-[#8b35f6] to-[#563df2] text-white shadow-[0_12px_28px_rgba(124,58,237,0.25)] hover:from-[#7c2ce4] hover:to-[#4430d8]"
              disabled={!input.trim() || loading}
              type="submit"
              size="icon"
            >
              <SendHorizontal className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Ввод отправляет сообщение. Первый ответ может занять 15–30 секунд.
          </p>
        </form>
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
