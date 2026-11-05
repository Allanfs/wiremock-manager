// Types mirroring the WireMock Admin API (v2/v3). Fields are optional because
// not every version returns every field.

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS" | "ANY";

export const HTTP_METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS", "ANY"];

export type StringMatcher = {
  equalTo?: string;
  contains?: string;
  matches?: string;
  doesNotMatch?: string;
  absent?: boolean;
  caseInsensitive?: boolean;
};

export type BodyPattern = {
  equalToJson?: unknown;
  matchesJsonPath?: string;
  matchesJsonSchema?: string;
  matches?: string;
  contains?: string;
  equalTo?: string;
  ignoreArrayOrder?: boolean;
  ignoreExtraElements?: boolean;
};

export type RequestPattern = {
  method?: string;
  url?: string;
  urlPath?: string;
  urlPattern?: string;
  urlPathPattern?: string;
  headers?: Record<string, StringMatcher>;
  queryParameters?: Record<string, StringMatcher>;
  bodyPatterns?: BodyPattern[];
};

export type DelayDistribution = { type: "uniform"; lower: number; upper: number } | { type: "lognormal"; median: number; sigma: number };

export type ResponseDefinition = {
  status: number;
  statusMessage?: string;
  headers?: Record<string, string>;
  body?: string;
  jsonBody?: unknown;
  base64Body?: string;
  bodyFileName?: string;
  fixedDelayMilliseconds?: number;
  delayDistribution?: DelayDistribution;
  transformers?: string[];
};

export type StubMapping = {
  id?: string;
  uuid?: string;
  name?: string;
  priority?: number;
  persistent?: boolean;
  request: RequestPattern;
  response: ResponseDefinition;
  scenarioName?: string;
  requiredScenarioState?: string;
  newScenarioState?: string;
  metadata?: Record<string, unknown>;
  insertionIndex?: number;
};

export type MappingsResponse = { mappings: StubMapping[]; meta?: { total: number } };

export type LoggedRequest = {
  url: string;
  absoluteUrl?: string;
  method: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, { key: string; values: string[] }>;
  body?: string;
  loggedDate?: number;
  loggedDateString?: string;
};

export type ServeEvent = {
  id: string;
  request: LoggedRequest;
  responseDefinition?: ResponseDefinition;
  response?: { status: number; headers?: Record<string, string>; body?: string };
  wasMatched?: boolean;
  stubMapping?: Partial<StubMapping>;
};

export type RequestsResponse = { requests: ServeEvent[]; meta?: { total: number }; requestJournalDisabled?: boolean };

export type Scenario = {
  id?: string;
  name: string;
  state: string;
  possibleStates?: string[];
  mappings?: Partial<StubMapping>[];
};

export type MappingKind = "specific" | "fallback";

export type ConnectionState = "connected" | "disconnected" | "auth-error" | "network-error" | "demo" | "checking";
