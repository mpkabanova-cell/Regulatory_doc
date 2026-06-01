export type Source = {
  document: string;
  section?: string | null;
  page?: number | null;
  quote: string;
  source_path: string;
  source_url?: string | null;
  type: string;
  level?: string | null;
  subject?: string | null;
  score?: number | null;
};

export type ChatResponse = {
  answer: string;
  sources: Source[];
  refusal: boolean;
};

export type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
};

export type UploadResponse = {
  upload_id: string;
  filename: string;
  content_type?: string | null;
};

export type ComplianceRow = {
  requirement: string;
  status: string;
  comment: string;
  source?: Source | null;
};

export type CheckResponse = {
  rows: ComplianceRow[];
  summary: string;
  sources: Source[];
};
