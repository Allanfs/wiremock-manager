import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, FileStack, GitBranch, Layers, Plug, Power } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MethodBadge, StatusBadge } from "@/components/wm/badges";
import { MatchSimulator } from "@/components/wm/MatchSimulator";
import { EmptyState, ErrorState, LoadingState, PageHeader, Section } from "@/components/wm/page";
import { cn } from "@/lib/utils";
import { useConnection, useMappings, useRequests, useScenarios } from "@/lib/wiremock/hooks";
import { classifyMapping, findConflicts, isDisabled } from "@/lib/wiremock/transform";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard · WireMock Manager" },
      { name: "description", content: "Visão geral da instância WireMock: stubs, fallbacks, cenários e requisições recentes." },
      { property: "og:title", content: "Dashboard · WireMock Manager" },
      { property: "og:description", content: "Visão geral da instância WireMock: stubs, fallbacks, cenários e requisições recentes." },
    ],
  }),
  component: Dashboard,
});

const CONN_LABEL: Record<string, string> = {
  connected: "Conectado",
  demo: "Demo",
  checking: "Verificando",
  disconnected: "Desconectado",
  "auth-error": "Erro de auth",
  "network-error": "Sem comunicação",
};

function Stat({ label, value, icon: Icon, tone }: { label: string; value: React.ReactNode; icon: React.ComponentType<{ className?: string }>; tone?: string }) {
  return (
    <div className="rounded-md border bg-card p-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {label}
        <Icon className={cn("h-4 w-4", tone)} />
      </div>
      <p className="mt-2 font-mono text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Dashboard() {
  const mappings = useMappings();
  const requests = useRequests();
  const scenarios = useScenarios();
  const conn = useConnection();
  const list = mappings.data ?? [];
  const conflicts = findConflicts(list);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Visão geral da instância WireMock conectada."
        actions={
          <Button asChild size="sm">
            <Link to="/mappings/new">Novo Mapping</Link>
          </Button>
        }
      />
      {mappings.isError ? (
        <ErrorState error={mappings.error} onRetry={() => mappings.refetch()} />
      ) : (
        <div className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Stat label="Stubs cadastrados" value={mappings.isPending ? "…" : list.length} icon={FileStack} />
            <Stat label="Stubs ativos" value={mappings.isPending ? "…" : list.filter((m) => !isDisabled(m)).length} icon={Power} tone="text-success" />
            <Stat label="Fallbacks" value={mappings.isPending ? "…" : list.filter((m) => classifyMapping(m) === "fallback").length} icon={Layers} tone="text-fallback" />
            <Stat label="Cenários" value={scenarios.isPending ? "…" : (scenarios.data?.length ?? "n/d")} icon={GitBranch} tone="text-info" />
            <Stat label="Conexão" value={<span className="text-base">{CONN_LABEL[conn.state]}</span>} icon={Plug} tone={conn.state === "connected" || conn.state === "demo" ? "text-success" : "text-destructive"} />
          </div>

          {conflicts.length > 0 && (
            <Link to="/fallback" className="flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-4 py-2.5 text-sm hover:bg-warning/15">
              <AlertTriangle className="h-4 w-4 text-warning" />
              {conflicts.length} possível(is) conflito(s) de prioridade entre regras.
              <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                Revisar <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          )}

          <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
            <Section
              title="Requisições recentes"
              description="Últimas entradas do Request Journal"
              actions={
                <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
                  <Link to="/journal">Ver tudo</Link>
                </Button>
              }
            >
              {requests.isPending ? (
                <LoadingState />
              ) : requests.isError ? (
                <p className="text-sm text-muted-foreground">Journal indisponível.</p>
              ) : !requests.data?.length ? (
                <EmptyState title="Nenhuma requisição registrada" />
              ) : (
                <div className="-m-4 divide-y">
                  {requests.data.slice(0, 8).map((r) => (
                    <div key={r.id} className="flex items-center gap-3 px-4 py-2 text-xs">
                      <MethodBadge method={r.request.method} />
                      <span className="min-w-0 flex-1 truncate font-mono">{r.request.url}</span>
                      <StatusBadge status={r.response?.status ?? r.responseDefinition?.status} />
                      <span className={cn("w-20 text-right", r.wasMatched ? "text-success" : "text-destructive")}>{r.wasMatched ? "matched" : "unmatched"}</span>
                      <span className="w-16 text-right font-mono text-muted-foreground">{r.request.loggedDate ? new Date(r.request.loggedDate).toLocaleTimeString("pt-BR") : "—"}</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>
            <Section title="Qual stub responde?" description="Simule método + URL">
              <MatchSimulator mappings={list} />
            </Section>
          </div>
        </div>
      )}
    </div>
  );
}
