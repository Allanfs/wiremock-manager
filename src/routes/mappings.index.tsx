import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Copy, Eye, FileStack, LayoutGrid, List, MoreHorizontal, Pencil, Plus, Power, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { KindBadge, MethodBadge, PriorityPill, StatusBadge } from "@/components/wm/badges";
import { MappingDetailsSheet } from "@/components/wm/MappingDetailsSheet";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/wm/page";
import { cn } from "@/lib/utils";
import { useDeleteMapping, useMappings, useToggleMapping } from "@/lib/wiremock/hooks";
import { classifyMapping, conflictIds, effectivePriority, findConflicts, isDisabled, mappingId, methodOf, setDisabled, urlMatcher } from "@/lib/wiremock/transform";
import type { StubMapping } from "@/lib/wiremock/types";

export const Route = createFileRoute("/mappings/")({
  head: () => ({
    meta: [
      { title: "Mappings · WireMock Manager" },
      { name: "description", content: "Liste, filtre e gerencie os stub mappings do WireMock." },
      { property: "og:title", content: "Mappings · WireMock Manager" },
      { property: "og:description", content: "Liste, filtre e gerencie os stub mappings do WireMock." },
    ],
  }),
  component: MappingsPage,
});

function MappingsPage() {
  const q = useMappings();
  const del = useDeleteMapping();
  const toggle = useToggleMapping();
  const navigate = useNavigate();
  const [view, setView] = useState<"table" | "cards">("table");
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState("all");
  const [status, setStatus] = useState("all");
  const [kind, setKind] = useState("all");
  const [priority, setPriority] = useState("all");
  const [sort, setSort] = useState<"priority" | "url" | "none">("priority");
  const [detail, setDetail] = useState<StubMapping | null>(null);
  const [toDelete, setToDelete] = useState<StubMapping | null>(null);

  const list = q.data ?? [];
  const conflicts = useMemo(() => conflictIds(findConflicts(list)), [list]);
  const priorities = [...new Set(list.map(effectivePriority))].sort((a, b) => a - b);
  const statuses = [...new Set(list.map((m) => m.response.status))].sort((a, b) => a - b);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    const r = list.filter((m) => {
      if (method !== "all" && methodOf(m) !== method) return false;
      if (status !== "all" && String(m.response.status) !== status) return false;
      if (kind !== "all" && classifyMapping(m) !== kind) return false;
      if (priority !== "all" && String(effectivePriority(m)) !== priority) return false;
      if (s && !`${urlMatcher(m).value} ${m.name ?? ""} ${mappingId(m)}`.toLowerCase().includes(s)) return false;
      return true;
    });
    if (sort === "priority") r.sort((a, b) => effectivePriority(a) - effectivePriority(b));
    if (sort === "url") r.sort((a, b) => urlMatcher(a).value.localeCompare(urlMatcher(b).value));
    return r;
  }, [list, search, method, status, kind, priority, sort]);

  const actions = (m: StubMapping) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Ações">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setDetail(m)}>
          <Eye className="h-3.5 w-3.5" /> Detalhes
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate({ to: "/mappings/$id", params: { id: mappingId(m) } })}>
          <Pencil className="h-3.5 w-3.5" /> Editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate({ to: "/mappings/new", search: { duplicate: mappingId(m) } })}>
          <Copy className="h-3.5 w-3.5" /> Duplicar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => toggle.mutate({ id: mappingId(m), mapping: setDisabled(m, !isDisabled(m)) })}>
          <Power className="h-3.5 w-3.5" /> {isDisabled(m) ? "Ativar" : "Desativar"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setToDelete(m)}>
          <Trash2 className="h-3.5 w-3.5" /> Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div>
      <PageHeader
        title="Mappings"
        description={q.data ? `${filtered.length} de ${list.length} stubs` : "Stubs cadastrados na instância"}
        actions={
          <Button asChild>
            <Link to="/mappings/new">
              <Plus className="h-4 w-4" /> Novo Mapping
            </Link>
          </Button>
        }
      />
      <div className="flex flex-wrap items-center gap-2 border-b px-6 py-2.5">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input className="h-8 pl-8 text-xs" placeholder="Buscar por URL, nome ou ID…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <FilterSelect value={method} onChange={setMethod} label="Método" options={["GET", "POST", "PUT", "PATCH", "DELETE", "ANY"]} />
        <FilterSelect value={status} onChange={setStatus} label="Status" options={statuses.map(String)} />
        <FilterSelect value={kind} onChange={setKind} label="Tipo" options={["specific", "fallback"]} labels={{ specific: "Específico", fallback: "Geral" }} />
        <FilterSelect value={priority} onChange={setPriority} label="Prioridade" options={priorities.map(String)} />
        <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
          <SelectTrigger className="h-8 w-[150px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="priority" className="text-xs">Ordenar: prioridade</SelectItem>
            <SelectItem value="url" className="text-xs">Ordenar: URL</SelectItem>
            <SelectItem value="none" className="text-xs">Ordem da API</SelectItem>
          </SelectContent>
        </Select>
        <ToggleGroup type="single" size="sm" value={view} onValueChange={(v) => v && setView(v as typeof view)}>
          <ToggleGroupItem value="table" aria-label="Tabela">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="cards" aria-label="Cards">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {q.isPending ? (
        <LoadingState />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<FileStack className="h-8 w-8" />} title={list.length ? "Nenhum mapping corresponde aos filtros" : "Nenhum mapping cadastrado"}>
          {!list.length && "Crie o primeiro stub para começar a simular respostas."}
        </EmptyState>
      ) : view === "table" ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[72px] pl-6">Método</TableHead>
              <TableHead>URL / pattern</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Criado</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((m) => (
              <TableRow key={mappingId(m)} className={cn("cursor-pointer text-xs", isDisabled(m) && "opacity-50")} onClick={() => setDetail(m)}>
                <TableCell className="pl-6">
                  <MethodBadge method={methodOf(m)} />
                </TableCell>
                <TableCell className="max-w-[320px]">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-mono">{urlMatcher(m).value}</span>
                    {conflicts.has(mappingId(m)) && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" aria-label="Possível conflito" />}
                    {isDisabled(m) && <span className="text-[10px] uppercase text-muted-foreground">desativado</span>}
                  </div>
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-muted-foreground">{m.name ?? "—"}</TableCell>
                <TableCell>
                  <StatusBadge status={m.response.status} />
                </TableCell>
                <TableCell>
                  <PriorityPill value={effectivePriority(m)} />
                </TableCell>
                <TableCell>
                  <KindBadge kind={classifyMapping(m)} />
                </TableCell>
                <TableCell className="font-mono text-[11px] text-muted-foreground">{mappingId(m).slice(0, 8)}</TableCell>
                <TableCell className="text-muted-foreground">{typeof m.metadata?.createdAt === "string" ? new Date(m.metadata.createdAt).toLocaleDateString("pt-BR") : "—"}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>{actions(m)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="grid gap-3 p-6 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((m) => (
            <div key={mappingId(m)} className={cn("cursor-pointer rounded-md border bg-card p-3 hover:border-primary/40", isDisabled(m) && "opacity-50")} onClick={() => setDetail(m)}>
              <div className="flex items-center gap-2">
                <MethodBadge method={methodOf(m)} />
                <span className="min-w-0 flex-1 truncate font-mono text-xs">{urlMatcher(m).value}</span>
                <div onClick={(e) => e.stopPropagation()}>{actions(m)}</div>
              </div>
              <p className="mt-2 truncate text-sm">{m.name ?? "Sem nome"}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <StatusBadge status={m.response.status} />
                <PriorityPill value={effectivePriority(m)} />
                <KindBadge kind={classifyMapping(m)} />
                {conflicts.has(mappingId(m)) && (
                  <span className="flex items-center gap-1 text-[11px] text-warning">
                    <AlertTriangle className="h-3 w-3" /> conflito
                  </span>
                )}
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">{mappingId(m).slice(0, 8)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <MappingDetailsSheet mapping={detail} onOpenChange={(o) => !o && setDetail(null)} />
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir mapping?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-mono">{toDelete && `${methodOf(toDelete)} ${urlMatcher(toDelete).value}`}</span> será removido da instância WireMock.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (toDelete) del.mutate(mappingId(toDelete));
                setToDelete(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FilterSelect({ value, onChange, label, options, labels }: { value: string; onChange: (v: string) => void; label: string; options: string[]; labels?: Record<string, string> }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn("h-8 w-[130px] text-xs", value !== "all" && "border-primary/60")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all" className="text-xs">
          {label}: todos
        </SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o} className="font-mono text-xs">
            {labels?.[o] ?? o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
