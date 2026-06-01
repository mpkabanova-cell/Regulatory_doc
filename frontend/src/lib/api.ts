import type { ChatFilters, ChatResponse, CheckResponse, CorpusStats, UploadResponse } from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:8000" : "");

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, init);
  if (!response.ok) {
    const detail = await parseError(response);
    throw new Error(detail || `Сервер вернул ошибку ${response.status}`);
  }
  return response.json() as Promise<T>;
}

async function parseError(response: Response): Promise<string> {
  const text = await response.text();
  if (!text) return "";
  try {
    const data = JSON.parse(text) as { detail?: string };
    return data.detail || text;
  } catch {
    return text;
  }
}

export function getStats(): Promise<CorpusStats> {
  return request<CorpusStats>("/stats", { method: "GET" });
}

export async function getHealth(): Promise<boolean> {
  try {
    await request<{ status: string }>("/health", { method: "GET" });
    return true;
  } catch {
    return false;
  }
}

export function sendChat(message: string, filters: ChatFilters = {}): Promise<ChatResponse> {
  return request<ChatResponse>("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, ...filters }),
  });
}

export function uploadDocument(file: File): Promise<UploadResponse> {
  const body = new FormData();
  body.append("file", file);
  return request<UploadResponse>("/upload", {
    method: "POST",
    body,
  });
}

export function checkDocument(uploadId: string, documentType: string): Promise<CheckResponse> {
  return request<CheckResponse>("/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ upload_id: uploadId, document_type: documentType }),
  });
}
