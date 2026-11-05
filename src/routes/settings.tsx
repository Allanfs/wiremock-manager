import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Plug, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PageHeader, Section } from "@/components/wm/page";
import { describeError } from "@/lib/wiremock/errors";
import { createSource } from "@/lib/wiremock/hooks";
import { saveSettings, useSettings, type ConnectionSettings } from "@/lib/wiremock/settings";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings · WireMock Manager" },
      { name: "description", content: "Configure a URL, autenticação e timeout da instância WireMock." },
      { property: "og:title", content: "Settings · WireMock Manager" },
      { property: "og:description", content: "Configure a URL, autenticação e timeout da instância WireMock." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const saved = useSettings();
  const qc = useQueryClient();
  const [v, setV] = useState<ConnectionSettings>(saved);
  const [test, setTest] = useState<{ state: "idle" | "running" | "ok" | "fail"; msg?: string }>({ state: "idle" });
  useEffect(() => setV(saved), [saved]);

  const runTest = async () => {
    setTest({ state: "running" });
    try {
      const src = createSource(v);
      await src.ping();
      const version = await src.getVersion();
      setTest({ state: "ok", msg: `Conectado${version ? ` · WireMock ${version}` : " · versão não informada pela instância"}` });
    } catch (e) {
      setTest({ state: "fail", msg: describeError(e) });
    }
  };

  const save = () => {
    saveSettings(v);
    qc.invalidateQueries();
    toast.success("Configurações salvas");
  };

  return (
    <div>
      <PageHeader title="Settings" description="Conexão com a Admin API do WireMock." />
      <div className="max-w-2xl space-y-4 p-6">
        <Section title="Fonte de dados">
          <div className="flex items-center gap-3">
            <Switch id="demo" checked={v.mode === "demo"} onCheckedChange={(c) => setV({ ...v, mode: c ? "demo" : "live" })} />
            <Label htmlFor="demo" className="text-sm">
              Modo demo <span className="text-xs text-muted-foreground">— usa dados de exemplo em memória, sem tocar em nenhuma instância</span>
            </Label>
          </div>
        </Section>
        <Section title="Instância WireMock">
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Base URL</Label>
              <Input className="font-mono text-xs" value={v.baseUrl} onChange={(e) => setV({ ...v, baseUrl: e.target.value })} placeholder="http://localhost:8080" />
              <p className="text-[11px] text-muted-foreground">Sem o sufixo /__admin. Padrão vindo de VITE_WIREMOCK_BASE_URL.</p>
            </div>
            <div className="grid grid-cols-[180px_1fr] gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Header de auth</Label>
                <Input className="font-mono text-xs" value={v.authHeader} onChange={(e) => setV({ ...v, authHeader: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Token (opcional)</Label>
                <Input type="password" className="font-mono text-xs" value={v.token} onChange={(e) => setV({ ...v, token: e.target.value })} placeholder="Bearer automático se for Authorization" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Timeout (ms)</Label>
              <Input type="number" className="w-32 font-mono text-xs" value={v.timeoutMs} onChange={(e) => setV({ ...v, timeoutMs: Number(e.target.value) || 5000 })} />
            </div>
            <p className="text-[11px] text-muted-foreground">
              O navegador chama a Admin API diretamente: a instância precisa permitir CORS para esta origem (ou use um proxy reverso na mesma origem). O token fica salvo apenas
              neste navegador.
            </p>
          </div>
        </Section>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={runTest} disabled={test.state === "running"}>
            {test.state === "running" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />} Testar conexão
          </Button>
          <Button onClick={save}>Salvar</Button>
          {test.state === "ok" && (
            <span className="flex items-center gap-1 text-xs text-success">
              <CheckCircle2 className="h-4 w-4" /> {test.msg}
            </span>
          )}
          {test.state === "fail" && (
            <span className="flex items-center gap-1 text-xs text-destructive">
              <XCircle className="h-4 w-4" /> {test.msg}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
