/** BYOK settings + anonymous visitor id — both live only in this browser. */
export interface LlmSettings {
  apiKey: string;
  baseURL: string;
  model: string;
}

export const DEFAULT_SETTINGS: LlmSettings = { apiKey: "", baseURL: "https://api.deepseek.com/v1", model: "deepseek-chat" };
const KEY = "proxy.llm";
const VISITOR = "proxy.visitor";

const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string | null) => {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {}
};

export function getSettings(): LlmSettings {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(read(KEY) ?? "{}") };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: LlmSettings | null) {
  write(KEY, s ? JSON.stringify(s) : null);
  window.dispatchEvent(new Event("proxy:settings-changed"));
}

export const hasKey = () => getSettings().apiKey.trim().length > 0;

let memoryVisitor: string | null = null;
export function getVisitorId(): string {
  const existing = read(VISITOR) ?? memoryVisitor;
  if (existing) return existing;
  const id = crypto.randomUUID();
  write(VISITOR, id);
  memoryVisitor = id;
  return id;
}

/** Ask the app shell to open the settings dialog (e.g. after a 401 llm_key_required). */
export const openSettings = (reason?: string) => window.dispatchEvent(new CustomEvent("proxy:open-settings", { detail: reason }));

export function requestHeaders(): Record<string, string> {
  const s = getSettings();
  const h: Record<string, string> = { "x-visitor-id": getVisitorId() };
  if (s.apiKey.trim()) {
    h["x-llm-key"] = s.apiKey.trim();
    if (s.baseURL.trim()) h["x-llm-base-url"] = s.baseURL.trim();
    if (s.model.trim()) h["x-llm-model"] = s.model.trim();
  }
  return h;
}
