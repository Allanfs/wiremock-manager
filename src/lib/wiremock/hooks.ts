import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";

import { WireMockClient, type WireMockDataSource } from "./client";
import { WireMockError, describeError } from "./errors";
import { MockDataSource } from "./mock-source";
import { useSettings, type ConnectionSettings } from "./settings";
import type { ConnectionState, StubMapping } from "./types";

// Application state layer: picks the data source (demo or real WireMock) and
// exposes react-query hooks. Components never call fetch directly.

const demo = new MockDataSource();

export function createSource(s: ConnectionSettings): WireMockDataSource {
  return s.mode === "demo" ? demo : new WireMockClient({ baseUrl: s.baseUrl, token: s.token, authHeader: s.authHeader, timeoutMs: s.timeoutMs });
}

export function useSource() {
  const s = useSettings();
  const source = useMemo(() => createSource(s), [s]);
  const scope = [s.mode, s.baseUrl, s.token] as const;
  return { source, scope, settings: s };
}

const isBrowser = typeof window !== "undefined";

export function useMappings() {
  const { source, scope } = useSource();
  return useQuery({ queryKey: ["mappings", ...scope], queryFn: () => source.listMappings(), enabled: isBrowser, retry: false });
}

export function useMapping(id: string) {
  const { source, scope } = useSource();
  return useQuery({ queryKey: ["mapping", id, ...scope], queryFn: () => source.getMapping(id), enabled: isBrowser, retry: false });
}

export function useRequests() {
  const { source, scope } = useSource();
  return useQuery({ queryKey: ["requests", ...scope], queryFn: () => source.listRequests(200), enabled: isBrowser, retry: false });
}

export function useScenarios() {
  const { source, scope } = useSource();
  return useQuery({ queryKey: ["scenarios", ...scope], queryFn: () => source.listScenarios(), enabled: isBrowser, retry: false });
}

export function useConnection(): { state: ConnectionState; version: string | null; error?: unknown } {
  const { source, scope, settings } = useSource();
  const q = useQuery({
    queryKey: ["connection", ...scope],
    queryFn: async () => {
      await source.ping();
      return await source.getVersion();
    },
    enabled: isBrowser,
    retry: false,
    refetchInterval: 30000,
  });
  if (q.isPending) return { state: "checking", version: null };
  if (q.isError) {
    const e = q.error;
    return { state: e instanceof WireMockError && e.kind === "auth" ? "auth-error" : e instanceof WireMockError && (e.kind === "network" || e.kind === "timeout") ? "network-error" : "disconnected", version: null, error: e };
  }
  return { state: settings.mode === "demo" ? "demo" : "connected", version: q.data ?? null };
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["mappings"] });
    qc.invalidateQueries({ queryKey: ["mapping"] });
    qc.invalidateQueries({ queryKey: ["scenarios"] });
  };
}

function onError(prefix: string) {
  return (e: unknown) => toast.error(prefix, { description: describeError(e) });
}

export function useSaveMapping() {
  const { source } = useSource();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, mapping }: { id?: string; mapping: StubMapping }) => (id ? source.updateMapping(id, mapping) : source.createMapping(mapping)),
    onSuccess: (_d, v) => {
      invalidate();
      toast.success(v.id ? "Mapping atualizado" : "Mapping criado");
    },
    onError: onError("Falha ao salvar mapping"),
  });
}

export function useDeleteMapping() {
  const { source } = useSource();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => source.deleteMapping(id),
    onSuccess: () => {
      invalidate();
      toast.success("Mapping excluído");
    },
    onError: onError("Falha ao excluir mapping"),
  });
}

export function useToggleMapping() {
  const { source } = useSource();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, mapping }: { id: string; mapping: StubMapping }) => source.updateMapping(id, mapping),
    onSuccess: (_d, v) => {
      invalidate();
      toast.success(v.mapping.metadata?.wmmDisabled ? "Mapping desativado" : "Mapping ativado");
    },
    onError: onError("Falha ao alterar estado"),
  });
}

export function useResetScenarios() {
  const { source } = useSource();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => source.resetScenarios(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scenarios"] });
      toast.success("Cenários resetados para o estado inicial");
    },
    onError: onError("Falha ao resetar cenários"),
  });
}

export function useClearRequests() {
  const { source } = useSource();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => source.clearRequests(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requests"] });
      toast.success("Request Journal limpo");
    },
    onError: onError("Falha ao limpar journal"),
  });
}
