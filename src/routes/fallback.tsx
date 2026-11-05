import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Info, Layers, Pencil, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MethodBadge, PriorityPill, StatusBadge } from "@/components/wm/badges";
import { MappingDetailsSheet } from "@/components/wm/MappingDetailsSheet";
import { MatchSimulator } from "@/components/wm/MatchSimulator";
import { EmptyState, ErrorState, LoadingState, PageHeader, Section } from "@/components/wm/page";
import { useMappings } from "@/lib/wiremock/hooks";
import { classifyMapping, conflictIds, effectivePriority, findConflicts, mappingId, methodOf, urlMatcher } from "@/lib/wiremock/transform";
import type { StubMapping } from "@/lib/wiremock/types";

export const Route = createFileRoute("/fallback")({
  head: () => ({
    meta: [
      { title: "Fallback Rules · WireMock Manager" },
      { name: "description", content: "Gerencie respostas gerais do WireMock e detecte conflitos de prioridade." },
      { property: "og:title", content: "Fallback Rules · WireMock Manager" },
      { property: "og:description", content: "Gerencie respostas gerais do WireMock e detecte conflitos de prioridade." },
    ],
  }),
  component: FallbackPage,
});

function FallbackPage() {
  const q = useMappings();
  const [detail, setDetail] = useState<StubMapping | null>(null);
  const list = q.data ?? [];
  const fallbacks = list.filter((m) => classifyMapping(m) === "fallback").sort((a, b) => effectivePriority(a) - effectivePriority(b));
  const conflicts = findConflicts(list);
  const ids = conflictIds(conflicts);

  return (
    <div>
      <PageHeader
        title="Fallback Rules"
        description="Respostas gerais usadas quando nenhuma regra específica corresponde."
        actions={
          <Button asChild>
            <Link to="/mappings/new" search={{ kind: "fallback" }}>
              <Plus className="h-4 w-4" /> Nova regra geral
            </Link>
          </Button>
        }
      />
      {q.isPending ? (
        <LoadingState />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <div className="space-y-4 p-6">
          <div className="flex items-start gap-2 rounded-md border border-info/30 bg-info/10 px-4 py-3 text-xs">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
            <p>
              O WireMock avalia os stubs pela <b>prioridade</b> (número menor primeiro) e pelos seus critérios de matching. Mantenha fallbacks com prioridade maior (ex.: 10)
              que as regras específicas (ex.: 1) para que estas sejam avaliadas antes. Em empate, vence o stub adicionado mais recentemente.
            </p>
          </div>

          {conflicts.length > 0 && (
            <Section title={`Possíveis conflitos (${conflicts.length})`} description="Regras que podem responder à mesma requisição com a mesma prioridade">
              <ul className="space-y-2">
                {conflicts.map((c, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    {[c.a, c.b].map((m, j) => (
                      <button key={j} type="button" onClick={() => setDetail(m)} className="flex items-center gap-1.5 rounded-sm bg-background/60 px-1.5 py-0.5 hover:bg-background">
                        <MethodBadge method={methodOf(m)} />
                        <span className="font-mono">{urlMatcher(m).value}</span>
                      </button>
                    ))}
                    <span className="text-muted-foreground">{c.reason}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
            <Section title="Regras gerais" description="Ordenadas por precedência">
              {fallbacks.length === 0 ? (
                <EmptyState icon={<Layers className="h-8 w-8" />} title="Nenhuma regra geral">
                  Crie uma regra com pattern abrangente, como <code>/api/.*</code>.
                </EmptyState>
              ) : (
                <div className="-m-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-4">Método</TableHead>
                        <TableHead>Pattern</TableHead>
                        <TableHead>Retorno</TableHead>
                        <TableHead>Prioridade</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fallbacks.map((m) => (
                        <TableRow key={mappingId(m)} className="cursor-pointer text-xs" onClick={() => setDetail(m)}>
                          <TableCell className="pl-4">
                            <MethodBadge method={methodOf(m)} />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono">{urlMatcher(m).value}</span>
                              {ids.has(mappingId(m)) && <AlertTriangle className="h-3.5 w-3.5 text-warning" aria-label="Possível conflito" />}
                            </div>
                            <p className="text-[11px] text-muted-foreground">{m.name}</p>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={m.response.status} />
                          </TableCell>
                          <TableCell>
                            <PriorityPill value={effectivePriority(m)} />
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-7 w-7" asChild aria-label="Editar">
                              <Link to="/mappings/$id" params={{ id: mappingId(m) }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Section>
            <Section title="Testar precedência" description="Veja qual regra responderia">
              <MatchSimulator mappings={list} onSelect={setDetail} />
            </Section>
          </div>
        </div>
      )}
      <MappingDetailsSheet mapping={detail} onOpenChange={(o) => !o && setDetail(null)} />
    </div>
  );
}
