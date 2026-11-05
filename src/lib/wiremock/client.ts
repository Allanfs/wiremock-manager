import { WireMockError } from "./errors";
import type { MappingsResponse, RequestsResponse, Scenario, ServeEvent, StubMapping } from "./types";

/** Contract shared by the real WireMock client and the in-memory demo source. */
export interface WireMockDataSource {
  getVersion(): Promise<string | null>;
  listMappings(): Promise<StubMapping[]>;
  getMapping(id: string): Promise<StubMapping>;
  createMapping(m: StubMapping): Promise<StubMapping>;
  updateMapping(id: string, m: StubMapping): Promise<StubMapping>;
  deleteMapping(id: string): Promise<void>;
  deleteAllMappings(): Promise<void>;
  listRequests(limit?: number): Promise<ServeEvent[]>;
  clearRequests(): Promise<void>;
  listScenarios(): Promise<Scenario[] | null>;
  resetScenarios(): Promise<void>;
  ping(): Promise<void>;
}

export type ClientConfig = {
  baseUrl: string;
  token?: string;
  authHeader?: string;
  timeoutMs: number;
};

export class WireMockClient implements WireMockDataSource {
  constructor(private config: ClientConfig) {}

  private url(path: string) {
    return this.config.baseUrl.replace(/\/+$/, "") + "/__admin" + path;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
    const headers: Record<string, string> = { Accept: "application/json" };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (this.config.token) {
      const name = this.config.authHeader || "Authorization";
      headers[name] = name.toLowerCase() === "authorization" && !/\s/.test(this.config.token) ? `Bearer ${this.config.token}` : this.config.token;
    }
    let res: Response;
    try {
      res = await fetch(this.url(path), {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (e) {
      if ((e as Error).name === "AbortError") throw new WireMockError("timeout", "Timeout");
      throw new WireMockError("network", (e as Error).message);
    } finally {
      clearTimeout(timer);
    }
    if (res.status === 401 || res.status === 403) throw new WireMockError("auth", "Unauthorized", res.status);
    if (res.status === 404) throw new WireMockError("not-found", `404 ${path}`, 404);
    if (res.status === 405 || res.status === 501) throw new WireMockError("unsupported", `${res.status} ${path}`, res.status);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new WireMockError("http", `HTTP ${res.status}${text ? `: ${text.slice(0, 200)}` : ""}`, res.status);
    }
    const text = await res.text();
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new WireMockError("invalid", "Resposta não é JSON válido");
    }
  }

  async ping() {
    await this.request("GET", "/mappings?limit=1");
  }

  async getVersion() {
    try {
      const r = await this.request<{ version?: string }>("GET", "/version");
      return r?.version ?? null;
    } catch (e) {
      // /version only exists in recent releases.
      if (e instanceof WireMockError && (e.kind === "not-found" || e.kind === "unsupported")) return null;
      throw e;
    }
  }

  async listMappings() {
    const r = await this.request<MappingsResponse>("GET", "/mappings");
    return r?.mappings ?? [];
  }

  getMapping(id: string) {
    return this.request<StubMapping>("GET", `/mappings/${encodeURIComponent(id)}`);
  }

  createMapping(m: StubMapping) {
    return this.request<StubMapping>("POST", "/mappings", m);
  }

  updateMapping(id: string, m: StubMapping) {
    return this.request<StubMapping>("PUT", `/mappings/${encodeURIComponent(id)}`, m);
  }

  async deleteMapping(id: string) {
    await this.request("DELETE", `/mappings/${encodeURIComponent(id)}`);
  }

  async deleteAllMappings() {
    await this.request("DELETE", "/mappings");
  }

  async listRequests(limit = 200) {
    const r = await this.request<RequestsResponse>("GET", `/requests?limit=${limit}`);
    return r?.requests ?? [];
  }

  async clearRequests() {
    await this.request("DELETE", "/requests");
  }

  async listScenarios() {
    try {
      const r = await this.request<{ scenarios: Scenario[] }>("GET", "/scenarios");
      return r?.scenarios ?? [];
    } catch (e) {
      if (e instanceof WireMockError && (e.kind === "not-found" || e.kind === "unsupported")) return null;
      throw e;
    }
  }

  async resetScenarios() {
    await this.request("POST", "/scenarios/reset");
  }
}
