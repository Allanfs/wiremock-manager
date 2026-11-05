import { Link } from "@tanstack/react-router";
import { Copy, Pencil } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DISABLE_HEADER, URL_MATCH_LABELS, classifyMapping, effectivePriority, mappingId, methodOf, urlMatcher } from "@/lib/wiremock/transform";
import type { StubMapping } from "@/lib/wiremock/types";
import { JsonView } from "./JsonEditor";
import { KindBadge, MethodBadge, PriorityPill, StatusBadge } from "./badges";

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 border-b py-1.5 text-xs last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="min-w-0 break-all font-mono">{v}</span>
    </div>
  );
}

export function MappingDetailsSheet({ mapping, onOpenChange }: { mapping: StubMapping | null; onOpenChange: (o: boolean) => void }) {
  const m = mapping;
  return (
    <Sheet open={!!m} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {m && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2 text-base">
                <MethodBadge method={methodOf(m)} />
                <span className="truncate font-mono text-sm">{urlMatcher(m).value}</span>
              </SheetTitle>
              <div className="flex flex-wrap items-center gap-1.5">
                <KindBadge kind={classifyMapping(m)} />
                <PriorityPill value={effectivePriority(m)} />
                <StatusBadge status={m.response.status} />
                <span className="text-xs text-muted-foreground">{m.name}</span>
              </div>
            </SheetHeader>
            <div className="mt-4 flex gap-2">
              <Button size="sm" asChild>
                <Link to="/mappings/$id" params={{ id: mappingId(m) }}>
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </Link>
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(m, null, 2));
                  toast.success("JSON copiado");
                }}
              >
                <Copy className="h-3.5 w-3.5" /> Copiar JSON
              </Button>
            </div>
            <Tabs defaultValue="summary" className="mt-4">
              <TabsList>
                <TabsTrigger value="summary">Resumo</TabsTrigger>
                <TabsTrigger value="json">JSON</TabsTrigger>
              </TabsList>
              <TabsContent value="summary" className="space-y-4">
                <div>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Request</h3>
                  <Row k="ID" v={mappingId(m)} />
                  <Row k="Correspondência" v={urlMatcher(m).type ? URL_MATCH_LABELS[urlMatcher(m).type!] : "qualquer"} />
                  {Object.entries(m.request.headers ?? {})
                    .filter(([k]) => k !== DISABLE_HEADER)
                    .map(([k, v]) => (
                      <Row key={k} k={`Header ${k}`} v={JSON.stringify(v)} />
                    ))}
                  {Object.entries(m.request.queryParameters ?? {}).map(([k, v]) => (
                    <Row key={k} k={`Query ${k}`} v={JSON.stringify(v)} />
                  ))}
                  {(m.request.bodyPatterns ?? []).map((p, i) => (
                    <Row key={i} k={`Body #${i + 1}`} v={JSON.stringify(p)} />
                  ))}
                  {m.scenarioName && <Row k="Cenário" v={`${m.scenarioName}: ${m.requiredScenarioState ?? "*"} → ${m.newScenarioState ?? "—"}`} />}
                </div>
                <div>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Response</h3>
                  <Row k="Status" v={m.response.status} />
                  {Object.entries(m.response.headers ?? {}).map(([k, v]) => (
                    <Row key={k} k={k} v={v} />
                  ))}
                  {m.response.fixedDelayMilliseconds ? <Row k="Delay fixo" v={`${m.response.fixedDelayMilliseconds} ms`} /> : null}
                  {m.response.delayDistribution?.type === "uniform" && <Row k="Delay aleatório" v={`${m.response.delayDistribution.lower}–${m.response.delayDistribution.upper} ms`} />}
                  {m.response.bodyFileName && <Row k="Arquivo" v={m.response.bodyFileName} />}
                  <div className="mt-2">
                    <JsonView value={m.response.jsonBody ?? m.response.body ?? ""} />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="json">
                <JsonView value={m} className="max-h-[70vh]" />
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
