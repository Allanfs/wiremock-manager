import type { BodyPattern, MappingKind, ServeEvent, StringMatcher, StubMapping } from "./types";
import { DISABLE_HEADER, classifyMapping, defaultPriorityFor, urlMatcher, type UrlMatchType } from "./transform";

// Converts between the visual form model and WireMock's JSON mapping.

export type MatcherOp = "equalTo" | "contains" | "matches" | "doesNotMatch" | "absent";
export type KeyValue = { key: string; op: MatcherOp; value: string };
export type BodyMatchType = "equalToJson" | "matchesJsonPath" | "matchesJsonSchema" | "matches" | "contains";
export type BodyCondition = { type: BodyMatchType; value: string };

export type MappingFormValues = {
  kind: MappingKind;
  name: string;
  method: string;
  urlType: UrlMatchType;
  url: string;
  headers: KeyValue[];
  query: KeyValue[];
  body: BodyCondition[];
  status: number;
  responseHeaders: { key: string; value: string }[];
  bodyMode: "json" | "text" | "file";
  responseBody: string;
  bodyFileName: string;
  delayType: "none" | "fixed" | "uniform";
  fixedDelay: number;
  delayLower: number;
  delayUpper: number;
  priority: number;
  uuid: string;
  scenarioName: string;
  requiredScenarioState: string;
  newScenarioState: string;
  persistent: boolean;
  metadata: Record<string, unknown>;
};

export const MATCHER_OPS: { value: MatcherOp; label: string }[] = [
  { value: "equalTo", label: "igual a" },
  { value: "contains", label: "contém" },
  { value: "matches", label: "regex" },
  { value: "doesNotMatch", label: "não casa regex" },
  { value: "absent", label: "ausente" },
];

export const BODY_MATCH_TYPES: { value: BodyMatchType; label: string }[] = [
  { value: "equalToJson", label: "JSON igual" },
  { value: "matchesJsonPath", label: "JSONPath" },
  { value: "matchesJsonSchema", label: "JSON Schema" },
  { value: "matches", label: "Regex" },
  { value: "contains", label: "Contém texto" },
];

export const COMMON_STATUS = [200, 201, 204, 400, 401, 403, 404, 409, 422, 500];

export function emptyForm(kind: MappingKind = "specific"): MappingFormValues {
  return {
    kind,
    name: "",
    method: kind === "fallback" ? "ANY" : "GET",
    urlType: kind === "fallback" ? "urlPathPattern" : "urlPath",
    url: kind === "fallback" ? "/api/.*" : "/api/",
    headers: [],
    query: [],
    body: [],
    status: 200,
    responseHeaders: [{ key: "Content-Type", value: "application/json" }],
    bodyMode: "json",
    responseBody: "{\n  \"ok\": true\n}",
    bodyFileName: "",
    delayType: "none",
    fixedDelay: 0,
    delayLower: 100,
    delayUpper: 500,
    priority: defaultPriorityFor(kind),
    uuid: "",
    scenarioName: "",
    requiredScenarioState: "",
    newScenarioState: "",
    persistent: true,
    metadata: {},
  };
}

function matcherToKv(key: string, m: StringMatcher): KeyValue {
  if (m.absent) return { key, op: "absent", value: "" };
  for (const op of ["equalTo", "contains", "matches", "doesNotMatch"] as const) {
    if (m[op] !== undefined) return { key, op, value: String(m[op]) };
  }
  return { key, op: "equalTo", value: "" };
}

function kvToMatchers(list: KeyValue[]): Record<string, StringMatcher> | undefined {
  const out: Record<string, StringMatcher> = {};
  for (const kv of list) {
    if (!kv.key.trim()) continue;
    out[kv.key.trim()] = kv.op === "absent" ? { absent: true } : { [kv.op]: kv.value };
  }
  return Object.keys(out).length ? out : undefined;
}

export function mappingToForm(m: StubMapping): MappingFormValues {
  const base = emptyForm(classifyMapping(m));
  const u = urlMatcher(m);
  const r = m.response;
  let bodyMode: MappingFormValues["bodyMode"] = "text";
  let responseBody = "";
  if (r.bodyFileName) bodyMode = "file";
  else if (r.jsonBody !== undefined) {
    bodyMode = "json";
    responseBody = JSON.stringify(r.jsonBody, null, 2);
  } else if (r.body !== undefined) {
    try {
      responseBody = JSON.stringify(JSON.parse(r.body), null, 2);
      bodyMode = "json";
    } catch {
      responseBody = r.body;
    }
  }
  return {
    ...base,
    name: m.name ?? "",
    method: (m.request.method ?? "ANY").toUpperCase(),
    urlType: u.type ?? "urlPathPattern",
    url: u.type ? u.value : ".*",
    headers: Object.entries(m.request.headers ?? {})
      .filter(([k]) => k !== DISABLE_HEADER)
      .map(([k, v]) => matcherToKv(k, v)),
    query: Object.entries(m.request.queryParameters ?? {}).map(([k, v]) => matcherToKv(k, v)),
    body: (m.request.bodyPatterns ?? []).map(bodyPatternToCondition),
    status: r.status,
    responseHeaders: Object.entries(r.headers ?? {}).map(([key, value]) => ({ key, value: String(value) })),
    bodyMode,
    responseBody,
    bodyFileName: r.bodyFileName ?? "",
    delayType: r.delayDistribution?.type === "uniform" ? "uniform" : r.fixedDelayMilliseconds ? "fixed" : "none",
    fixedDelay: r.fixedDelayMilliseconds ?? 0,
    delayLower: r.delayDistribution?.type === "uniform" ? r.delayDistribution.lower : 100,
    delayUpper: r.delayDistribution?.type === "uniform" ? r.delayDistribution.upper : 500,
    priority: m.priority ?? 5,
    uuid: m.id ?? m.uuid ?? "",
    scenarioName: m.scenarioName ?? "",
    requiredScenarioState: m.requiredScenarioState ?? "",
    newScenarioState: m.newScenarioState ?? "",
    persistent: m.persistent ?? true,
    metadata: m.metadata ?? {},
  };
}

function bodyPatternToCondition(p: BodyPattern): BodyCondition {
  if (p.equalToJson !== undefined) return { type: "equalToJson", value: typeof p.equalToJson === "string" ? p.equalToJson : JSON.stringify(p.equalToJson, null, 2) };
  if (p.matchesJsonPath !== undefined) return { type: "matchesJsonPath", value: p.matchesJsonPath };
  if (p.matchesJsonSchema !== undefined) return { type: "matchesJsonSchema", value: typeof p.matchesJsonSchema === "string" ? p.matchesJsonSchema : JSON.stringify(p.matchesJsonSchema, null, 2) };
  if (p.matches !== undefined) return { type: "matches", value: p.matches };
  return { type: "contains", value: p.contains ?? p.equalTo ?? "" };
}

export type FormErrors = Partial<Record<"url" | "responseBody" | "body" | "priority" | "delay", string>>;

export function validateForm(v: MappingFormValues): FormErrors {
  const e: FormErrors = {};
  if (!v.url.trim()) e.url = "Informe a URL ou o pattern.";
  if ((v.urlType === "urlPattern" || v.urlType === "urlPathPattern") && v.url) {
    try {
      new RegExp(v.url);
    } catch {
      e.url = "Expressão regular inválida.";
    }
  }
  if (v.bodyMode === "json" && v.responseBody.trim()) {
    try {
      JSON.parse(v.responseBody);
    } catch {
      e.responseBody = "JSON inválido.";
    }
  }
  for (const c of v.body) {
    if ((c.type === "equalToJson" || c.type === "matchesJsonSchema") && c.value.trim()) {
      try {
        JSON.parse(c.value);
      } catch {
        e.body = "Uma condição de body contém JSON inválido.";
      }
    }
  }
  if (!Number.isFinite(v.priority) || v.priority < 1) e.priority = "Prioridade deve ser ≥ 1.";
  if (v.delayType === "uniform" && v.delayLower > v.delayUpper) e.delay = "O mínimo deve ser menor que o máximo.";
  return e;
}

export function formToMapping(v: MappingFormValues): StubMapping {
  const request: StubMapping["request"] = { method: v.method };
  request[v.urlType] = v.url.trim();
  const headers = kvToMatchers(v.headers);
  const prevDisabled = (v.metadata.wmmDisabled === true);
  if (headers || prevDisabled) request.headers = { ...(headers ?? {}) };
  if (prevDisabled) request.headers![DISABLE_HEADER] = { equalTo: `disabled-${v.uuid || "mapping"}` };
  const query = kvToMatchers(v.query);
  if (query) request.queryParameters = query;
  const body = v.body
    .filter((c) => c.value.trim())
    .map((c): BodyPattern => {
      if (c.type === "equalToJson") return { equalToJson: JSON.parse(c.value) };
      if (c.type === "matchesJsonSchema") return { matchesJsonSchema: c.value };
      return { [c.type]: c.value } as BodyPattern;
    });
  if (body.length) request.bodyPatterns = body;

  const response: StubMapping["response"] = { status: Number(v.status) };
  const rh = Object.fromEntries(v.responseHeaders.filter((h) => h.key.trim()).map((h) => [h.key.trim(), h.value]));
  if (Object.keys(rh).length) response.headers = rh;
  if (v.status !== 204) {
    if (v.bodyMode === "file" && v.bodyFileName.trim()) response.bodyFileName = v.bodyFileName.trim();
    else if (v.bodyMode === "json" && v.responseBody.trim()) response.jsonBody = JSON.parse(v.responseBody);
    else if (v.bodyMode === "text" && v.responseBody) response.body = v.responseBody;
  }
  if (v.delayType === "fixed" && v.fixedDelay > 0) response.fixedDelayMilliseconds = v.fixedDelay;
  if (v.delayType === "uniform") response.delayDistribution = { type: "uniform", lower: v.delayLower, upper: v.delayUpper };

  const m: StubMapping = {
    request,
    response,
    priority: v.priority,
    persistent: v.persistent,
    metadata: { ...v.metadata, wmmKind: v.kind },
  };
  if (v.name.trim()) m.name = v.name.trim();
  if (v.uuid.trim()) {
    m.id = v.uuid.trim();
    m.uuid = v.uuid.trim();
  }
  if (v.scenarioName.trim()) {
    m.scenarioName = v.scenarioName.trim();
    if (v.requiredScenarioState.trim()) m.requiredScenarioState = v.requiredScenarioState.trim();
    if (v.newScenarioState.trim()) m.newScenarioState = v.newScenarioState.trim();
  }
  return m;
}

const SKIP_HEADERS = /^(host|content-length|connection|accept-encoding|user-agent|accept)$/i;

export function formFromServeEvent(e: ServeEvent): MappingFormValues {
  const f = emptyForm("specific");
  const [path, qs] = e.request.url.split("?");
  f.name = `${e.request.method} ${path}`;
  f.method = e.request.method.toUpperCase();
  f.urlType = "urlPath";
  f.url = path ?? "/";
  f.query = qs ? [...new URLSearchParams(qs).entries()].map(([key, value]) => ({ key, op: "equalTo" as const, value })) : [];
  f.headers = Object.entries(e.request.headers ?? {})
    .filter(([k]) => !SKIP_HEADERS.test(k))
    .map(([key, value]) => ({ key, op: "equalTo" as const, value: String(value) }));
  if (e.request.body) {
    try {
      f.body = [{ type: "equalToJson", value: JSON.stringify(JSON.parse(e.request.body), null, 2) }];
    } catch {
      f.body = [{ type: "contains", value: e.request.body }];
    }
  }
  return f;
}
