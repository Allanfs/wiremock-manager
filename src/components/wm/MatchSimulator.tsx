import { useState } from "react";
import { Crosshair } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { classifyMapping, effectivePriority, mappingId, methodOf, rankCandidates, urlMatcher } from "@/lib/wiremock/transform";
import type { StubMapping } from "@/lib/wiremock/types";
import { KindBadge, MethodBadge, PriorityPill, StatusBadge } from "./badges";

/** Shows which stubs could answer a request, in WireMock's evaluation order. */
export function MatchSimulator({ mappings, onSelect }: { mappings: StubMapping[]; onSelect?: (m: StubMapping) => void }) {
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("/api/products/123");
  const ranked = url ? rankCandidates(mappings, method, url) : [];
  const winnerIdx = ranked.findIndex((r) => !r.conditional);

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        <Select value={method} onValueChange={setMethod}>
          <SelectTrigger className="h-8 w-[110px] font-mono text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
              <SelectItem key={m} value={m} className="font-mono text-xs">
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input className="h-8 font-mono text-xs" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/api/products/123?x=1" />
      </div>
      {ranked.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum stub corresponde a método + URL. O WireMock retornaria 404.</p>
      ) : (
        <ol className="space-y-1">
          {ranked.map((r, i) => (
            <li key={mappingId(r.mapping)}>
              <button
                type="button"
                onClick={() => onSelect?.(r.mapping)}
                className={cn("flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs hover:bg-accent", i === winnerIdx ? "border-primary/60 bg-primary/10" : "border-border")}
              >
                <span className="w-4 font-mono text-muted-foreground">{i + 1}</span>
                <MethodBadge method={methodOf(r.mapping)} />
                <span className="min-w-0 flex-1 truncate font-mono">{urlMatcher(r.mapping).value}</span>
                <KindBadge kind={classifyMapping(r.mapping)} compact />
                <PriorityPill value={effectivePriority(r.mapping)} />
                <StatusBadge status={r.mapping.response.status} />
                {i === winnerIdx && <Crosshair className="h-3.5 w-3.5 text-primary" />}
                {r.conditional && <span className="text-[10px] text-warning">condicional</span>}
              </button>
            </li>
          ))}
        </ol>
      )}
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Ordem estimada: menor número de prioridade primeiro; em empate, o stub adicionado mais recentemente. Stubs <span className="text-warning">condicionais</span> só
        respondem se headers, query ou body também casarem. O WireMock aplica seus próprios critérios de matching na decisão final.
      </p>
    </div>
  );
}
