import { describe, expect, it } from "vitest";

import { classifyMapping, findConflicts, rankCandidates } from "@/lib/wiremock/transform";
import { emptyForm, formToMapping } from "@/lib/wiremock/form-model";
import type { StubMapping } from "@/lib/wiremock/types";

const specific: StubMapping = { id: "s", priority: 1, request: { method: "GET", url: "/api/products/123" }, response: { status: 200 } };
const fallback: StubMapping = { id: "f", priority: 10, request: { method: "GET", urlPathPattern: "/api/.*" }, response: { status: 200 } };

describe("wiremock rules", () => {
  it("classifies regex URL without matchers as fallback", () => {
    expect(classifyMapping(fallback)).toBe("fallback");
    expect(classifyMapping(specific)).toBe("specific");
  });

  it("new fallback defaults to priority 10, specific to 1", () => {
    expect(emptyForm("fallback").priority).toBe(10);
    expect(emptyForm("specific").priority).toBe(1);
  });

  it("lower priority number is evaluated first", () => {
    const ranked = rankCandidates([fallback, specific], "GET", "/api/products/123");
    expect(ranked[0]?.mapping.id).toBe("s");
  });

  it("flags same-priority overlapping rules as conflict", () => {
    const other: StubMapping = { ...fallback, id: "f2", request: { method: "GET", urlPattern: "/api/.*" } };
    expect(findConflicts([fallback, other])).toHaveLength(1);
    expect(findConflicts([fallback, specific])).toHaveLength(0);
  });

  it("form serialises JSON body as jsonBody", () => {
    const m = formToMapping({ ...emptyForm(), url: "/x", responseBody: '{"a":1}' });
    expect(m.response.jsonBody).toEqual({ a: 1 });
    expect(m.request.urlPath).toBe("/x");
  });
});
