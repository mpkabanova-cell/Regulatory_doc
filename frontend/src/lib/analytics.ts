const YANDEX_METRIKA_COUNTER_ID = 108472990;

type AnalyticsValue = string | number | boolean | null | undefined;
type AnalyticsPayload = Record<string, AnalyticsValue>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    ym?: (counterId: number, action: "reachGoal", goal: string, payload?: Record<string, unknown>) => void;
  }
}

export function trackEvent(goalSlug: string, payload: AnalyticsPayload = {}) {
  const cleanPayload = cleanAnalyticsPayload(payload);
  const metrikaPayload = Object.keys(cleanPayload).length ? { [goalSlug]: cleanPayload } : undefined;

  window.ym?.(YANDEX_METRIKA_COUNTER_ID, "reachGoal", goalSlug, metrikaPayload);

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: goalSlug,
    ...cleanPayload,
  });
}

function cleanAnalyticsPayload(payload: AnalyticsPayload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );
}

export function toPromptSlug(prompt: string) {
  return prompt
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

export function fileExtension(filename: string) {
  const extension = filename.split(".").pop();
  return extension && extension !== filename ? extension.toLowerCase() : "unknown";
}
