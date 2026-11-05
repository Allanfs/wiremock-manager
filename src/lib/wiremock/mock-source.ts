import type { WireMockDataSource } from "./client";
import { WireMockError } from "./errors";
import type { Scenario, ServeEvent, StubMapping } from "./types";

// In-memory demo instance. Behaves like a WireMock server so the UI can be
// exercised without a real instance; it is clearly labelled "Demo" in the UI.

const now = Date.now();
const uid = () => (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(16).slice(2) + Date.now().toString(16));

const seedMappings: StubMapping[] = [
  {
    id: "a1f3c2e0-0001-4c1a-9e11-000000000001",
    name: "Produto 123",
    priority: 1,
    request: { method: "GET", url: "/api/products/123" },
    response: { status: 200, headers: { "Content-Type": "application/json" }, jsonBody: { id: 123, name: "Teclado mecânico", price: 459.9 } },
    metadata: { createdAt: new Date(now - 86400000 * 3).toISOString() },
  },
  {
    id: "a1f3c2e0-0002-4c1a-9e11-000000000002",
    name: "Criar pedido (cliente VIP)",
    priority: 1,
    request: {
      method: "POST",
      urlPath: "/api/orders",
      headers: { "X-Customer-Tier": { equalTo: "vip" } },
      bodyPatterns: [{ matchesJsonPath: "$.items[0]" }],
    },
    response: { status: 201, headers: { "Content-Type": "application/json" }, jsonBody: { orderId: "ORD-9001", priority: "express" }, fixedDelayMilliseconds: 250 },
    metadata: { createdAt: new Date(now - 86400000 * 2).toISOString() },
  },
  {
    id: "a1f3c2e0-0003-4c1a-9e11-000000000003",
    name: "Pedido inválido",
    priority: 2,
    request: { method: "POST", urlPath: "/api/orders", bodyPatterns: [{ equalToJson: { items: [] } }] },
    response: { status: 422, headers: { "Content-Type": "application/json" }, jsonBody: { error: "items must not be empty" } },
  },
  {
    id: "a1f3c2e0-0004-4c1a-9e11-000000000004",
    name: "Busca de usuários",
    priority: 3,
    request: { method: "GET", urlPath: "/api/users", queryParameters: { q: { contains: "ana" } } },
    response: { status: 200, headers: { "Content-Type": "application/json" }, jsonBody: [{ id: 7, name: "Ana Souza" }] },
  },
  {
    id: "a1f3c2e0-0005-4c1a-9e11-000000000005",
    name: "Produtos — não encontrado",
    priority: 5,
    request: { method: "GET", urlPathPattern: "/api/products/.*" },
    response: { status: 404, headers: { "Content-Type": "application/json" }, jsonBody: { error: "product not found" } },
    metadata: { wmmKind: "fallback" },
  },
  {
    id: "a1f3c2e0-0006-4c1a-9e11-000000000006",
    name: "Fallback GET /api",
    priority: 10,
    request: { method: "GET", urlPathPattern: "/api/.*" },
    response: { status: 200, headers: { "Content-Type": "application/json" }, jsonBody: { data: [] } },
    metadata: { wmmKind: "fallback" },
  },
  {
    id: "a1f3c2e0-0007-4c1a-9e11-000000000007",
    name: "Fallback POST /api",
    priority: 10,
    request: { method: "POST", urlPathPattern: "/api/.*" },
    response: { status: 201, headers: { "Content-Type": "application/json" }, jsonBody: { created: true } },
    metadata: { wmmKind: "fallback" },
  },
  {
    id: "a1f3c2e0-0008-4c1a-9e11-000000000008",
    name: "Fallback DELETE /api",
    priority: 10,
    request: { method: "DELETE", urlPathPattern: "/api/.*" },
    response: { status: 204 },
    metadata: { wmmKind: "fallback" },
  },
  {
    id: "a1f3c2e0-0009-4c1a-9e11-000000000009",
    name: "Catch-all GET legado",
    priority: 10,
    request: { method: "GET", urlPattern: "/api/.*" },
    response: { status: 200, body: "ok" },
    metadata: { wmmKind: "fallback" },
  },
  {
    id: "a1f3c2e0-0010-4c1a-9e11-000000000010",
    name: "Checkout — carrinho vazio",
    priority: 1,
    scenarioName: "checkout",
    requiredScenarioState: "Started",
    newScenarioState: "item-added",
    request: { method: "POST", url: "/api/cart/items" },
    response: { status: 201, jsonBody: { items: 1 } },
  },
  {
    id: "a1f3c2e0-0011-4c1a-9e11-000000000011",
    name: "Checkout — com item",
    priority: 1,
    scenarioName: "checkout",
    requiredScenarioState: "item-added",
    request: { method: "GET", url: "/api/cart" },
    response: { status: 200, jsonBody: { items: [{ sku: "KB-01", qty: 1 }] } },
  },
  {
    id: "a1f3c2e0-0012-4c1a-9e11-000000000012",
    name: "Health",
    priority: 1,
    request: { method: "GET", url: "/health" },
    response: { status: 500, body: "degraded", delayDistribution: { type: "uniform", lower: 100, upper: 600 } },
  },
];

function ev(minAgo: number, method: string, url: string, status: number, mappingId?: string, body?: string, resBody?: string): ServeEvent {
  const m = mappingId ? seedMappings.find((x) => x.id === mappingId) : undefined;
  const t = now - minAgo * 60000;
  return {
    id: uid(),
    request: {
      url,
      absoluteUrl: "http://localhost:8080" + url,
      method,
      headers: { Host: "localhost:8080", "User-Agent": "curl/8.4.0", Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ?? "",
      loggedDate: t,
      loggedDateString: new Date(t).toISOString(),
    },
    responseDefinition: m?.response ?? { status },
    response: { status, headers: { "Content-Type": "application/json" }, body: resBody ?? (m?.response.jsonBody ? JSON.stringify(m.response.jsonBody) : (m?.response.body ?? "")) },
    wasMatched: !!m,
    stubMapping: m ? { id: m.id, name: m.name } : undefined,
  };
}

const seedRequests: ServeEvent[] = [
  ev(1, "GET", "/api/products/123", 200, "a1f3c2e0-0001-4c1a-9e11-000000000001"),
  ev(3, "GET", "/api/products/999", 404, "a1f3c2e0-0005-4c1a-9e11-000000000005"),
  ev(6, "POST", "/api/orders", 422, "a1f3c2e0-0003-4c1a-9e11-000000000003", '{"items":[]}'),
  ev(9, "GET", "/api/users?q=ana", 200, "a1f3c2e0-0004-4c1a-9e11-000000000004"),
  ev(14, "PUT", "/api/users/7", 404, undefined, '{"name":"Ana S."}', "No response could be served as there are no stub mappings in this WireMock instance."),
  ev(20, "GET", "/health", 500, "a1f3c2e0-0012-4c1a-9e11-000000000012"),
  ev(31, "DELETE", "/api/sessions/42", 204, "a1f3c2e0-0008-4c1a-9e11-000000000008"),
  ev(47, "GET", "/v2/catalog", 404, undefined),
];

const delay = (ms = 180) => new Promise((r) => setTimeout(r, ms));
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

export class MockDataSource implements WireMockDataSource {
  private mappings = clone(seedMappings);
  private requests = clone(seedRequests);
  private scenarioStates: Record<string, string> = { checkout: "item-added" };

  async ping() {
    await delay(80);
  }
  async getVersion() {
    await delay(60);
    return "3.9.1 (demo)";
  }
  async listMappings() {
    await delay();
    return clone(this.mappings);
  }
  async getMapping(id: string) {
    await delay();
    const m = this.mappings.find((x) => x.id === id);
    if (!m) throw new WireMockError("not-found", "Mapping não encontrado", 404);
    return clone(m);
  }
  async createMapping(m: StubMapping) {
    await delay();
    const id = m.id || m.uuid || uid();
    if (this.mappings.some((x) => x.id === id)) throw new WireMockError("http", `HTTP 409: mapping ${id} já existe`, 409);
    const created = { ...clone(m), id, uuid: id, metadata: { ...m.metadata, createdAt: new Date().toISOString() } };
    this.mappings.push(created);
    return clone(created);
  }
  async updateMapping(id: string, m: StubMapping) {
    await delay();
    const i = this.mappings.findIndex((x) => x.id === id);
    if (i < 0) throw new WireMockError("not-found", "Mapping não encontrado", 404);
    this.mappings[i] = { ...clone(m), id, uuid: id };
    return clone(this.mappings[i]);
  }
  async deleteMapping(id: string) {
    await delay();
    this.mappings = this.mappings.filter((x) => x.id !== id);
  }
  async deleteAllMappings() {
    await delay();
    this.mappings = [];
  }
  async listRequests() {
    await delay();
    return clone(this.requests);
  }
  async clearRequests() {
    await delay();
    this.requests = [];
  }
  async listScenarios() {
    await delay();
    const map = new Map<string, Scenario>();
    for (const m of this.mappings) {
      if (!m.scenarioName) continue;
      const s = map.get(m.scenarioName) ?? { id: m.scenarioName, name: m.scenarioName, state: this.scenarioStates[m.scenarioName] ?? "Started", possibleStates: [], mappings: [] };
      for (const st of [m.requiredScenarioState, m.newScenarioState]) if (st && !s.possibleStates!.includes(st)) s.possibleStates!.push(st);
      s.mappings!.push({ id: m.id, name: m.name, request: m.request });
      map.set(m.scenarioName, s);
    }
    return [...map.values()];
  }
  async resetScenarios() {
    await delay();
    this.scenarioStates = {};
  }
}
