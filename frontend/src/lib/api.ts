import type { ChatResponse, CheckResponse, UploadResponse } from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, init);
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function sendChat(message: string): Promise<ChatResponse> {
  return request<ChatResponse>("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
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
