import { useState } from "react";
import { ChevronDown, Info, Layers, Plus, Save, Target, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { BODY_MATCH_TYPES, COMMON_STATUS, formToMapping, validateForm, type BodyMatchType, type MappingFormValues } from "@/lib/wiremock/form-model";
import { URL_MATCH_LABELS, defaultPriorityFor, type UrlMatchType } from "@/lib/wiremock/transform";
import { HTTP_METHODS, type StubMapping } from "@/lib/wiremock/types";
import { CodeEditor, JsonView } from "./JsonEditor";
import { MatcherListEditor, PairListEditor } from "./KeyValueEditor";
import { StatusBadge } from "./badges";

function Field({ label, hint, error, children, className }: { label: string; hint?: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
      {error ? <p className="text-[11px] text-destructive">{error}</p> : hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Panel({ title, tag, children }: { title: string; tag: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border bg-card">
      <header className="flex items-center gap-2 border-b px-4 py-2.5">
        <span className="rounded-sm bg-secondary px-1.5 py-0.5 font-mono text-[10px] font-bold text-muted-foreground">{tag}</span>
        <h2 className="text-[13px] font-semibold">{title}</h2>
      </header>
      <div className="space-y-4 p-4">{children}</div>
    </section>
  );
}

export function MappingForm({ initial, isEdit, submitting, onSubmit }: { initial: MappingFormValues; isEdit?: boolean; submitting?: boolean; onSubmit: (m: StubMapping) => void }) {
  const [v, setV] = useState<MappingFormValues>(initial);
  const [touched, setTouched] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(!!(initial.scenarioName || isEdit));
  const set = <K extends keyof MappingFormValues>(k: K, val: MappingFormValues[K]) => setV((p) => ({ ...p, [k]: val }));
  const errors = touched ? validateForm(v) : {};

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (Object.keys(validateForm(v)).length) return;
    onSubmit(formToMapping(v));
  };

  let preview: StubMapping | null = null;
  try {
    if (!Object.keys(validateForm(v)).length) preview = formToMapping(v);
  } catch {
    preview = null;
  }

  return (
    <form onSubmit={submit} className="space-y-4 p-6">
      <div className="grid gap-2 sm:grid-cols-2">
        {(["specific", "fallback"] as const).map((k) => {
          const Icon = k === "fallback" ? Layers : Target;
          const active = v.kind === k;
          return (
            <button
              type="button"
              key={k}
              onClick={() => setV((p) => ({ ...p, kind: k, priority: p.priority === defaultPriorityFor(p.kind) ? defaultPriorityFor(k) : p.priority }))}
              className={cn("flex items-start gap-3 rounded-md border p-3 text-left transition-colors", active ? (k === "fallback" ? "border-fallback/60 bg-fallback/10" : "border-info/60 bg-info/10") : "hover:bg-accent")}
            >
              <Icon className={cn("mt-0.5 h-4 w-4", k === "fallback" ? "text-fallback" : "text-info")} />
              <div>
                <p className="text-sm font-medium">{k === "fallback" ? "Resposta geral (fallback)" : "Resposta específica"}</p>
                <p className="text-xs text-muted-foreground">{k === "fallback" ? "Pattern abrangente, usado quando nenhuma regra específica casa. Prioridade padrão 10." : "Casa uma requisição precisa (URL, headers, body). Prioridade padrão 1."}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Configuração da requisição" tag="REQUEST">
          <Field label="Nome / descrição">
            <Input value={v.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex.: Produto 123" />
          </Field>
          <div className="grid grid-cols-[120px_160px_1fr] gap-2">
            <Field label="Método">
              <Select value={v.method} onValueChange={(m) => set("method", m)}>
                <SelectTrigger className="font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HTTP_METHODS.map((m) => (
                    <SelectItem key={m} value={m} className="font-mono text-xs">
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Correspondência">
              <Select value={v.urlType} onValueChange={(t) => set("urlType", t as UrlMatchType)}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(URL_MATCH_LABELS) as UrlMatchType[]).map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">
                      {URL_MATCH_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={v.urlType.includes("Pattern") ? "Pattern (regex)" : "URL"} error={errors.url}>
              <Input className="font-mono text-xs" value={v.url} onChange={(e) => set("url", e.target.value)} />
            </Field>
          </div>
          <Field label="Headers esperados">
            <MatcherListEditor items={v.headers} onChange={(x) => set("headers", x)} keyPlaceholder="Header" addLabel="Adicionar header" />
          </Field>
          <Field label="Query parameters">
            <MatcherListEditor items={v.query} onChange={(x) => set("query", x)} keyPlaceholder="Parâmetro" addLabel="Adicionar parâmetro" />
          </Field>
          <Field label="Body matching" error={errors.body} hint="Todas as condições precisam casar.">
            <div className="space-y-2">
              {v.body.map((c, i) => (
                <div key={i} className="space-y-1.5 rounded-md border bg-background/50 p-2">
                  <div className="flex items-center gap-2">
                    <Select value={c.type} onValueChange={(t) => set("body", v.body.map((b, j) => (j === i ? { ...b, type: t as BodyMatchType } : b)))}>
                      <SelectTrigger className="h-8 w-[170px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BODY_MATCH_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value} className="text-xs">
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex-1" />
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label="Remover condição" onClick={() => set("body", v.body.filter((_, j) => j !== i))}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {c.type === "equalToJson" || c.type === "matchesJsonSchema" ? (
                    <CodeEditor value={c.value} minRows={4} onChange={(val) => set("body", v.body.map((b, j) => (j === i ? { ...b, value: val } : b)))} />
                  ) : (
                    <Input className="h-8 font-mono text-xs" placeholder={c.type === "matchesJsonPath" ? "$.items[?(@.qty > 0)]" : "valor"} value={c.value} onChange={(e) => set("body", v.body.map((b, j) => (j === i ? { ...b, value: e.target.value } : b)))} />
                  )}
                </div>
              ))}
              <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => set("body", [...v.body, { type: "matchesJsonPath", value: "" }])}>
                <Plus className="h-3.5 w-3.5" /> Adicionar condição
              </Button>
            </div>
          </Field>
        </Panel>

        <Panel title="Configuração da resposta" tag="RESPONSE">
          <Field label="HTTP status">
            <div className="flex flex-wrap items-center gap-1">
              {COMMON_STATUS.map((s) => (
                <button type="button" key={s} onClick={() => set("status", s)} className={cn("rounded-sm border px-0.5 py-0.5", v.status === s ? "border-primary" : "border-transparent")}>
                  <StatusBadge status={s} />
                </button>
              ))}
              <Input type="number" className="ml-1 h-7 w-20 font-mono text-xs" value={v.status} onChange={(e) => set("status", Number(e.target.value))} />
            </div>
          </Field>
          <Field label="Headers da resposta">
            <PairListEditor items={v.responseHeaders} onChange={(x) => set("responseHeaders", x)} />
          </Field>
          <Field label="Body" error={errors.responseBody} hint={v.status === 204 ? "Status 204 não envia body." : undefined}>
            <Tabs value={v.bodyMode} onValueChange={(m) => set("bodyMode", m as MappingFormValues["bodyMode"])}>
              <TabsList className="h-8">
                <TabsTrigger value="json" className="text-xs">JSON</TabsTrigger>
                <TabsTrigger value="text" className="text-xs">Texto</TabsTrigger>
                <TabsTrigger value="file" className="text-xs">Arquivo</TabsTrigger>
              </TabsList>
              <TabsContent value="json">
                <CodeEditor value={v.responseBody} onChange={(x) => set("responseBody", x)} />
              </TabsContent>
              <TabsContent value="text">
                <CodeEditor mode="text" value={v.responseBody} onChange={(x) => set("responseBody", x)} />
              </TabsContent>
              <TabsContent value="file">
                <Input className="font-mono text-xs" placeholder="product-123.json" value={v.bodyFileName} onChange={(e) => set("bodyFileName", e.target.value)} />
                <p className="mt-1 text-[11px] text-muted-foreground">Relativo ao diretório __files da instância WireMock.</p>
              </TabsContent>
            </Tabs>
          </Field>
          <Field label="Delay" error={errors.delay}>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={v.delayType} onValueChange={(d) => set("delayType", d as MappingFormValues["delayType"])}>
                <SelectTrigger className="h-8 w-[160px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-xs">Sem delay</SelectItem>
                  <SelectItem value="fixed" className="text-xs">Fixed delay</SelectItem>
                  <SelectItem value="uniform" className="text-xs">Aleatório (uniforme)</SelectItem>
                </SelectContent>
              </Select>
              {v.delayType === "fixed" && (
                <Input type="number" className="h-8 w-28 font-mono text-xs" value={v.fixedDelay} onChange={(e) => set("fixedDelay", Number(e.target.value))} aria-label="Delay em ms" />
              )}
              {v.delayType === "uniform" && (
                <>
                  <Input type="number" className="h-8 w-24 font-mono text-xs" value={v.delayLower} onChange={(e) => set("delayLower", Number(e.target.value))} aria-label="Mínimo ms" />
                  <span className="text-xs text-muted-foreground">até</span>
                  <Input type="number" className="h-8 w-24 font-mono text-xs" value={v.delayUpper} onChange={(e) => set("delayUpper", Number(e.target.value))} aria-label="Máximo ms" />
                </>
              )}
              {v.delayType !== "none" && <span className="text-xs text-muted-foreground">ms</span>}
            </div>
          </Field>
          <Field label="Pré-visualização da resposta">
            <div className="rounded-md border bg-background p-3 font-mono text-[12px]">
              <p>
                HTTP/1.1 <StatusBadge status={v.status} />
              </p>
              {v.responseHeaders
                .filter((h) => h.key)
                .map((h, i) => (
                  <p key={i} className="text-muted-foreground">
                    <span className="text-code-key">{h.key}</span>: {h.value}
                  </p>
                ))}
              <div className="mt-2">
                {v.status === 204 ? (
                  <span className="text-muted-foreground">(sem body)</span>
                ) : v.bodyMode === "file" ? (
                  <span className="text-muted-foreground">conteúdo de __files/{v.bodyFileName || "…"}</span>
                ) : (
                  <JsonView value={v.responseBody} className="max-h-48 border-0 p-0" />
                )}
              </div>
            </div>
          </Field>
        </Panel>
      </div>

      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen} className="rounded-md border bg-card">
        <CollapsibleTrigger className="flex w-full items-center gap-2 px-4 py-2.5 text-left">
          <ChevronDown className={cn("h-4 w-4 transition-transform", advancedOpen && "rotate-180")} />
          <span className="text-[13px] font-semibold">Configurações avançadas</span>
          <span className="text-xs text-muted-foreground">prioridade, UUID, cenário, persistência</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="grid gap-4 border-t p-4 md:grid-cols-2">
          <Field label="Prioridade" error={errors.priority}>
            <div className="flex items-center gap-3">
              <Input type="number" min={1} className="w-24 font-mono" value={v.priority} onChange={(e) => set("priority", Number(e.target.value))} />
              <div className="flex-1">
                <div className="h-1.5 rounded-full bg-gradient-to-r from-primary via-muted-foreground/40 to-muted" />
                <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                  <span>1 · avaliado primeiro</span>
                  <span>10+ · avaliado por último</span>
                </div>
              </div>
            </div>
            <p className="flex items-start gap-1 text-[11px] text-muted-foreground">
              <Info className="mt-0.5 h-3 w-3 shrink-0" /> Número menor = maior prioridade. Sem prioridade, o WireMock usa 5.
            </p>
          </Field>
          <Field label="UUID" hint={isEdit ? "Identificador do mapping (não editável)." : "Opcional — gerado pelo WireMock se vazio."}>
            <Input className="font-mono text-xs" value={v.uuid} disabled={isEdit} onChange={(e) => set("uuid", e.target.value)} placeholder="auto" />
          </Field>
          <Field label="Scenario">
            <Input value={v.scenarioName} onChange={(e) => set("scenarioName", e.target.value)} placeholder="checkout" />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Required state">
              <Input disabled={!v.scenarioName} value={v.requiredScenarioState} onChange={(e) => set("requiredScenarioState", e.target.value)} placeholder="Started" />
            </Field>
            <Field label="New state">
              <Input disabled={!v.scenarioName} value={v.newScenarioState} onChange={(e) => set("newScenarioState", e.target.value)} placeholder="item-added" />
            </Field>
          </div>
          <div className="flex items-center gap-3">
            <Switch id="persistent" checked={v.persistent} onCheckedChange={(c) => set("persistent", c)} />
            <Label htmlFor="persistent" className="text-sm">
              Persistente <span className="text-xs text-muted-foreground">— salvo em disco (requer WireMock com persistência)</span>
            </Label>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Collapsible className="rounded-md border bg-card">
        <CollapsibleTrigger className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13px] font-semibold">
          <ChevronDown className="h-4 w-4" /> JSON gerado
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t p-4">{preview ? <JsonView value={preview} className="max-h-96" /> : <p className="text-xs text-destructive">Corrija os erros do formulário para gerar o JSON.</p>}</CollapsibleContent>
      </Collapsible>

      <div className="sticky bottom-0 -mx-6 flex items-center justify-end gap-2 border-t bg-background/95 px-6 py-3 backdrop-blur">
        {touched && Object.keys(errors).length > 0 && <span className="mr-auto text-xs text-destructive">Há campos com erro.</span>}
        <Button type="button" variant="ghost" onClick={() => history.back()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          <Save className="h-4 w-4" /> {submitting ? "Salvando…" : isEdit ? "Salvar alterações" : "Criar mapping"}
        </Button>
      </div>
    </form>
  );
}
