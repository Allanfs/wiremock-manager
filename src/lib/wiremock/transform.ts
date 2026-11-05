import type { MappingKind, StubMapping } from "./types";

// Pure rules about mappings: classification, priority, URL display,
// matching simulation and conflict detection.

export const WIREMOCK_DEFAULT_PRIORITY = 5;
export const DEFAULT_SPECIFIC_PRIORITY = 1;
export const DEFAULT_FALLBACK_PRIORITY = 10;
/** Header used to "disable" a mapping: it requires a value no real client sends. */
export const DISABLE_HEADER = "X-WMM-Disabled-Mapping";

export type UrlMatchType = "url" | "urlPath" | "urlPattern" | "urlPathPattern";

export const URL_MATCH_LABELS: Record<UrlMatchType, string> = {
  url: "Exact URL",
  urlPath: "URL Path",
  urlPattern: "URL Regex",
  urlPathPattern: "URL Path Regex",
};

export function mappingId(m: StubMapping): string {
  return m.id ?? m.uuid ?? "";
}

export function effectivePriority(m: StubMapping): number {
  return m.priority ?? WIREMOCK_DEFAULT_PRIORITY;
}

export function urlMatcher(m: StubMapping): { type: UrlMatchType | null; value: string } {
  const r = m.request;
  if (r.url !== undefined) return { type: "url", value: r.url };
  if (r.urlPath !== undefined) return { type: "urlPath", value: r.urlPath };
  if (r.urlPattern !== undefined) return { type: "urlPattern", value: r.urlPattern };
  if (r.urlPathPattern !== undefined) return { type: "urlPathPattern", value: r.urlPathPattern };
  return { type: null, value: "(qualquer URL)" };
}

export function methodOf(m: StubMapping): string {
  return (m.request.method ?? "ANY").toUpperCase();
}

export function isDisabled(m: StubMapping): boolean {
  return m.metadata?.wmmDisabled === true;
}

function extraMatcherCount(m: StubMapping): number {
  const r = m.request;
  const headers = Object.keys(r.headers ?? {}).filter((h) => h !== DISABLE_HEADER).length;
  return headers + Object.keys(r.queryParameters ?? {}).length + (r.bodyPatterns?.length ?? 0);
}

/**
 * Fallback = broad rule: explicitly tagged, or a regex/absent URL (or ANY method)
 * without extra header/query/body matchers. Everything else is specific.
 */
export function classifyMapping(m: StubMapping): MappingKind {
  const tag = m.metadata?.wmmKind;
  if (tag === "fallback" || tag === "specific") return tag;
  const { type } = urlMatcher(m);
  const broadUrl = type === null || type === "urlPattern" || type === "urlPathPattern";
  if (extraMatcherCount(m) > 0) return "specific";
  if (broadUrl) return "fallback";
  return "specific";
}

export function defaultPriorityFor(kind: MappingKind): number {
  return kind === "fallback" ? DEFAULT_FALLBACK_PRIORITY : DEFAULT_SPECIFIC_PRIORITY;
}

function safeRegex(src: string): RegExp | null {
  try {
    return new RegExp(`^(?:${src})$`);
  } catch {
    return null;
  }
}

/** Does the mapping's method + URL matcher accept this request? (headers/body ignored) */
export function urlAndMethodMatch(m: StubMapping, method: string, url: string): boolean {
  const mm = methodOf(m);
  if (mm !== "ANY" && mm !== method.toUpperCase()) return false;
  const path = url.split("?")[0] ?? url;
  const { type, value } = urlMatcher(m);
  switch (type) {
    case null:
      return true;
    case "url":
      return value === url;
    case "urlPath":
      return value === path;
    case "urlPattern":
      return !!safeRegex(value)?.test(url);
    case "urlPathPattern":
      return !!safeRegex(value)?.test(path);
  }
}

/**
 * Candidates ordered the way WireMock evaluates them: lowest priority number
 * first; ties go to the most recently added stub (higher insertion order).
 */
export function rankCandidates(mappings: StubMapping[], method: string, url: string) {
  return mappings
    .map((m, index) => ({ m, index }))
    .filter(({ m }) => !isDisabled(m) && urlAndMethodMatch(m, method, url))
    .sort((a, b) => {
      const p = effectivePriority(a.m) - effectivePriority(b.m);
      if (p !== 0) return p;
      const ia = a.m.insertionIndex ?? a.index;
      const ib = b.m.insertionIndex ?? b.index;
      return ib - ia;
    })
    .map(({ m }) => ({ mapping: m, conditional: extraMatcherCount(m) > 0 }));
}

/** A concrete example URL a matcher would accept, used to test overlap. */
function sampleUrl(m: StubMapping): string {
  const { type, value } = urlMatcher(m);
  if (type === "url" || type === "urlPath") return value;
  if (type === null) return "/__any__";
  return value
    .replace(/\[\^\/\]\+|\[\^\/\]\*/g, "x")
    .replace(/\\d\+|\\d\*|\[0-9\]\+/g, "1")
    .replace(/\.\*|\.\+/g, "x")
    .replace(/\\(.)/g, "$1")
    .replace(/[\^$()?]/g, "");
}

export type Conflict = { a: StubMapping; b: StubMapping; reason: string };

/**
 * Two rules may conflict when methods overlap, their URLs can match the same
 * request and they share the same priority — WireMock then picks the most
 * recently added one, which is rarely what the user intends.
 */
export function findConflicts(mappings: StubMapping[]): Conflict[] {
  const active = mappings.filter((m) => !isDisabled(m));
  const out: Conflict[] = [];
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i]!;
      const b = active[j]!;
      const ma = methodOf(a);
      const mb = methodOf(b);
      if (ma !== "ANY" && mb !== "ANY" && ma !== mb) continue;
      if (effectivePriority(a) !== effectivePriority(b)) continue;
      if (extraMatcherCount(a) > 0 || extraMatcherCount(b) > 0) continue;
      const method = ma === "ANY" ? mb : ma;
      const overlap = urlAndMethodMatch(a, method === "ANY" ? "GET" : method, sampleUrl(b)) || urlAndMethodMatch(b, method === "ANY" ? "GET" : method, sampleUrl(a));
      if (overlap) {
        out.push({ a, b, reason: `Mesma prioridade (${effectivePriority(a)}) e URLs sobrepostas para ${method === "ANY" ? "qualquer método" : method}` });
      }
    }
  }
  return out;
}

export function conflictIds(conflicts: Conflict[]): Set<string> {
  const s = new Set<string>();
  for (const c of conflicts) {
    s.add(mappingId(c.a));
    s.add(mappingId(c.b));
  }
  return s;
}

export function statusTone(status?: number): "success" | "info" | "warning" | "destructive" | "muted" {
  if (!status) return "muted";
  if (status < 300) return "success";
  if (status < 400) return "info";
  if (status < 500) return "warning";
  return "destructive";
}

export function setDisabled(m: StubMapping, disabled: boolean): StubMapping {
  const headers = { ...(m.request.headers ?? {}) };
  if (disabled) headers[DISABLE_HEADER] = { equalTo: `disabled-${mappingId(m) || "mapping"}` };
  else delete headers[DISABLE_HEADER];
  const metadata = { ...(m.metadata ?? {}) };
  if (disabled) metadata.wmmDisabled = true;
  else delete metadata.wmmDisabled;
  return {
    ...m,
    request: { ...m.request, headers: Object.keys(headers).length ? headers : undefined },
    metadata,
  };
}

export function toCurl(req: { method: string; absoluteUrl?: string; url: string; headers?: Record<string, string>; body?: string }, baseUrl: string): string {
  const url = req.absoluteUrl || baseUrl.replace(/\/+$/, "") + req.url;
  const parts = [`curl -X ${req.method} '${url}'`];
  for (const [k, v] of Object.entries(req.headers ?? {})) {
    if (/^(host|content-length|connection)$/i.test(k)) continue;
    parts.push(`  -H '${k}: ${String(v).replace(/'/g, "'\\''")}'`);
  }
  if (req.body) parts.push(`  --data '${req.body.replace(/'/g, "'\\''")}'`);
  return parts.join(" \\\n");
}
