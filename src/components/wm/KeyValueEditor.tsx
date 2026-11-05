import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MATCHER_OPS, type KeyValue, type MatcherOp } from "@/lib/wiremock/form-model";

export function MatcherListEditor({ items, onChange, keyPlaceholder = "Nome", addLabel = "Adicionar" }: { items: KeyValue[]; onChange: (v: KeyValue[]) => void; keyPlaceholder?: string; addLabel?: string }) {
  const update = (i: number, patch: Partial<KeyValue>) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  return (
    <div className="space-y-1.5">
      {items.map((kv, i) => (
        <div key={i} className="grid grid-cols-[1fr_130px_1.4fr_auto] gap-1.5">
          <Input className="h-8 font-mono text-xs" placeholder={keyPlaceholder} value={kv.key} onChange={(e) => update(i, { key: e.target.value })} />
          <Select value={kv.op} onValueChange={(op) => update(i, { op: op as MatcherOp })}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MATCHER_OPS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input className="h-8 font-mono text-xs" placeholder="Valor" disabled={kv.op === "absent"} value={kv.value} onChange={(e) => update(i, { value: e.target.value })} />
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Remover" onClick={() => onChange(items.filter((_, j) => j !== i))}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => onChange([...items, { key: "", op: "equalTo", value: "" }])}>
        <Plus className="h-3.5 w-3.5" /> {addLabel}
      </Button>
    </div>
  );
}

export function PairListEditor({ items, onChange, addLabel = "Adicionar header" }: { items: { key: string; value: string }[]; onChange: (v: { key: string; value: string }[]) => void; addLabel?: string }) {
  const update = (i: number, patch: Partial<{ key: string; value: string }>) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  return (
    <div className="space-y-1.5">
      {items.map((kv, i) => (
        <div key={i} className="grid grid-cols-[1fr_1.4fr_auto] gap-1.5">
          <Input className="h-8 font-mono text-xs" placeholder="Header" value={kv.key} onChange={(e) => update(i, { key: e.target.value })} />
          <Input className="h-8 font-mono text-xs" placeholder="Valor" value={kv.value} onChange={(e) => update(i, { value: e.target.value })} />
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Remover" onClick={() => onChange(items.filter((_, j) => j !== i))}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => onChange([...items, { key: "", value: "" }])}>
        <Plus className="h-3.5 w-3.5" /> {addLabel}
      </Button>
    </div>
  );
}
