import { createFileRoute, Link } from "@tanstack/react-router";
import { GitBranch, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MethodBadge } from "@/components/wm/badges";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/wm/page";
import { cn } from "@/lib/utils";
import { useResetScenarios, useScenarios } from "@/lib/wiremock/hooks";

export const Route = createFileRoute("/scenarios")({
  head: () => ({
    meta: [
      { title: "Scenarios · WireMock Manager" },
      { name: "description", content: "Acompanhe os cenários com estado do WireMock e resete-os." },
      { property: "og:title", content: "Scenarios · WireMock Manager" },
      { property: "og:description", content: "Acompanhe os cenários com estado do WireMock e resete-os." },
    ],
  }),
  component: ScenariosPage,
});

function ScenariosPage() {
  const q = useScenarios();
  const reset = useResetScenarios();
  return (
    <div>
      <PageHeader
        title="Scenarios"
        description="Cenários com estado e seus mappings."
        actions={
          <Button variant="secondary" size="sm" onClick={() => reset.mutate()} disabled={reset.isPending}>
            <RotateCcw className="h-3.5 w-3.5" /> Resetar todos
          </Button>
        }
      />
      {q.isPending ? (
        <LoadingState />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : q.data === null ? (
        <EmptyState icon={<GitBranch className="h-8 w-8" />} title="Listagem de cenários não suportada">
          Esta versão do WireMock não expõe <code>GET /__admin/scenarios</code>. O reset continua disponível.
        </EmptyState>
      ) : q.data.length === 0 ? (
        <EmptyState icon={<GitBranch className="h-8 w-8" />} title="Nenhum cenário cadastrado">
          Defina um Scenario nas configurações avançadas de um mapping.
        </EmptyState>
      ) : (
        <div className="grid gap-3 p-6 lg:grid-cols-2">
          {q.data.map((s) => {
            const states = [...new Set(["Started", ...(s.possibleStates ?? [])])];
            return (
              <div key={s.id ?? s.name} className="rounded-md border bg-card">
                <div className="flex items-center gap-2 border-b px-4 py-2.5">
                  <GitBranch className="h-4 w-4 text-info" />
                  <span className="font-mono text-sm font-semibold">{s.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">estado atual</span>
                  <span className="rounded-sm bg-primary/15 px-1.5 py-0.5 font-mono text-xs text-primary">{s.state}</span>
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {states.map((st, i) => (
                      <span key={st} className="flex items-center gap-1.5">
                        {i > 0 && <span className="text-muted-foreground">→</span>}
                        <span className={cn("rounded-sm border px-1.5 py-0.5 font-mono text-[11px]", st === s.state ? "border-primary text-primary" : "text-muted-foreground")}>{st}</span>
                      </span>
                    ))}
                  </div>
                  <div className="space-y-1">
                    {(s.mappings ?? []).map((m) => (
                      <Link key={m.id} to="/mappings/$id" params={{ id: m.id ?? "" }} className="flex items-center gap-2 rounded-md px-2 py-1 text-xs hover:bg-accent">
                        <MethodBadge method={m.request?.method} />
                        <span className="font-mono">{m.request?.url ?? m.request?.urlPath ?? m.request?.urlPattern ?? m.request?.urlPathPattern}</span>
                        <span className="ml-auto truncate text-muted-foreground">{m.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
