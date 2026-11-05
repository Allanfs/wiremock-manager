import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Copy, FilePlus2, RefreshCw, ScrollText, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MethodBadge, StatusBadge } from "@/components/wm/badges";
import { JsonView } from "@/components/wm/JsonEditor";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/wm/page";
import { cn } from "@/lib/utils";
import { useClearRequests, useRequests, useSource } from "@/lib/wiremock/hooks";
import { toCurl } from "@/lib/wiremock/transform";
import type { ServeEvent } from "@/lib/wiremock/types";

export const Route = createFileRoute("/journal")({
  head: () => ({
    meta: [
      { title: "Request Journal · WireMock Manager" },
      { name: "description", content: "Inspecione requisições recebidas pelo WireMock e transforme-as em mappings." },
      { property: "og:title", content: "Request Journal · WireMock Manager" },
      { property: "og:description", content: "Inspecione requisições recebidas pelo WireMock e transforme-as em mappings." },
    ],
  }),
  component: JournalPage,
});

const PERIODS: Record<string, number> = { all: Infinity, "15m": 15, "1h": 60, "24h": 1440 };

function KV({ data }: { data?: Record<string, unknown> }) {
  const entries = Object.entries(data ?? {});
  if (!entries.length) return <p className="text-xs text-muted-foreground">(nenhum)</p>;
  return (
    <div className="rounded-md border">
      {entries.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[160px_1fr] gap-2 border-b px-2 py-1 font-mono text-[11px] last:border-0">
          <span className="text-code-key">{k}</span>
          <span className="break-all">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
        </div>
      ))}
    </div>
  );
}

function JournalPage() {
  const q = useRequests();
  const clear = useClearRequests();
  const { settings } = useSource();
  const navigate = useNavigate();
  const [method, setMethod] = useState("all");
  const [url, setUrl] = useState("");
  const [period, setPeriod] = useState("all");
  const [match, setMatch] = useState("all");
  const [sel, setSel] = useState<ServeEvent | null>(null);

  const filtered = useMemo(() => {
    const now = Date.now();
    return (q.data ?? []).filter((r) => {
      if (method !== "all" && r.request.method !== method) return false;
      if (url && !r.request.url.toLowerCase().includes(url.toLowerCase())) return false;
      if (match !== "all" && (match === "matched") !== !!r.wasMatched) return false;
      if (period !== "all" && r.request.loggedDate && now - r.request.loggedDate > (PERIODS[period] ?? Infinity) * 60000) return false;
      return true;
    });
  }, [q.data, method, url, period, match]);

  const queryParams = (r: ServeEvent) => {
    if (r.request.queryParams) return Object.fromEntries(Object.values(r.request.queryParams).map((p) => [p.key, p.values.join(", ")]));
    const qs = r.request.url.split("?")[1];
    return qs ? Object.fromEntries(new URLSearchParams(qs)) : {};
  };

  return (
    <div>
      <PageHeader
        title="Request Journal"
        description="Requisições recebidas pela instância."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => q.refetch()}>
              <RefreshCw className={cn("h-3.5 w-3.5", q.isFetching && "animate-spin")} /> Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={() => clear.mutate()} disabled={clear.isPending}>
              <Trash2 className="h-3.5 w-3.5" /> Limpar
            </Button>
          </>
        }
      />
      <div className="flex flex-wrap items-center gap-2 border-b px-6 py-2.5">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input className="h-8 pl-8 text-xs" placeholder="Filtrar por URL…" value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        {[
          { v: method, s: setMethod, opts: [["all", "Método: todos"], ...["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => [m, m])] },
          { v: period, s: setPeriod, opts: [["all", "Período: tudo"], ["15m", "Últimos 15 min"], ["1h", "Última hora"], ["24h", "Últimas 24h"]] },
          { v: match, s: setMatch, opts: [["all", "Correspondência: todas"], ["matched", "Matched"], ["unmatched", "Unmatched"]] },
        ].map((f, i) => (
          <Select key={i} value={f.v} onValueChange={f.s}>
            <SelectTrigger className="h-8 w-[170px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {f.opts.map(([val, label]) => (
                <SelectItem key={val} value={val!} className="text-xs">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
      </div>
      {q.isPending ? (
        <LoadingState />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<ScrollText className="h-8 w-8" />} title="Nenhuma requisição encontrada" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Método</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Horário</TableHead>
              <TableHead>Correspondência</TableHead>
              <TableHead>Mapping</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id} className="cursor-pointer text-xs" onClick={() => setSel(r)}>
                <TableCell className="pl-6">
                  <MethodBadge method={r.request.method} />
                </TableCell>
                <TableCell className="max-w-[360px] truncate font-mono">{r.request.url}</TableCell>
                <TableCell className="font-mono text-muted-foreground">{r.request.loggedDate ? new Date(r.request.loggedDate).toLocaleString("pt-BR") : (r.request.loggedDateString ?? "—")}</TableCell>
                <TableCell>
                  <span className={cn("rounded-sm px-1.5 py-0.5 text-[11px]", r.wasMatched ? "bg-success/12 text-success" : "bg-destructive/12 text-destructive")}>{r.wasMatched ? "matched" : "unmatched"}</span>
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-muted-foreground">{r.stubMapping?.name ?? r.stubMapping?.id?.slice(0, 8) ?? "—"}</TableCell>
                <TableCell>
                  <StatusBadge status={r.response?.status ?? r.responseDefinition?.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Sheet open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {sel && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2 text-base">
                  <MethodBadge method={sel.request.method} />
                  <span className="truncate font-mono text-sm">{sel.request.url}</span>
                </SheetTitle>
              </SheetHeader>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => navigate({ to: "/mappings/new", search: { fromRequest: sel.id } })}>
                  <FilePlus2 className="h-3.5 w-3.5" /> Criar mapping a partir desta
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(toCurl(sel.request, settings.baseUrl));
                    toast.success("cURL copiado");
                  }}
                >
                  <Copy className="h-3.5 w-3.5" /> Copiar cURL
                </Button>
              </div>
              <Tabs defaultValue="request" className="mt-4">
                <TabsList>
                  <TabsTrigger value="request">Request</TabsTrigger>
                  <TabsTrigger value="response">Response</TabsTrigger>
                </TabsList>
                <TabsContent value="request" className="space-y-3">
                  <p className="break-all font-mono text-xs">{sel.request.absoluteUrl ?? sel.request.url}</p>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground">Headers</h4>
                  <KV data={sel.request.headers} />
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground">Query parameters</h4>
                  <KV data={queryParams(sel)} />
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground">Body</h4>
                  <JsonView value={sel.request.body ?? ""} />
                </TabsContent>
                <TabsContent value="response" className="space-y-3">
                  <StatusBadge status={sel.response?.status ?? sel.responseDefinition?.status} />
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground">Headers</h4>
                  <KV data={sel.response?.headers ?? sel.responseDefinition?.headers} />
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground">Body</h4>
                  <JsonView value={sel.response?.body ?? sel.responseDefinition?.body ?? sel.responseDefinition?.jsonBody ?? ""} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
