import { cva } from "class-variance-authority";
import { Layers, Target } from "lucide-react";

import { cn } from "@/lib/utils";
import { statusTone } from "@/lib/wiremock/transform";
import type { MappingKind } from "@/lib/wiremock/types";

const methodVariants = cva("inline-flex h-5 min-w-[3.25rem] items-center justify-center rounded-sm px-1.5 font-mono text-[10.5px] font-bold tracking-wide", {
  variants: {
    method: {
      GET: "bg-method-get/15 text-method-get",
      POST: "bg-method-post/15 text-method-post",
      PUT: "bg-method-put/15 text-method-put",
      PATCH: "bg-method-patch/15 text-method-patch",
      DELETE: "bg-method-delete/15 text-method-delete",
      ANY: "bg-method-any/15 text-method-any",
    },
  },
  defaultVariants: { method: "ANY" },
});

type KnownMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "ANY";

export function MethodBadge({ method, className }: { method?: string; className?: string }) {
  const m = (method ?? "ANY").toUpperCase();
  const known = (["GET", "POST", "PUT", "PATCH", "DELETE"].includes(m) ? m : "ANY") as KnownMethod;
  return <span className={cn(methodVariants({ method: known }), className)}>{m === "DELETE" ? "DEL" : m}</span>;
}

const toneClass = {
  success: "text-success bg-success/12",
  info: "text-info bg-info/12",
  warning: "text-warning bg-warning/12",
  destructive: "text-destructive bg-destructive/12",
  muted: "text-muted-foreground bg-muted",
};

export function StatusBadge({ status, className }: { status?: number; className?: string }) {
  return <span className={cn("inline-flex h-5 items-center rounded-sm px-1.5 font-mono text-[11px] font-semibold", toneClass[statusTone(status)], className)}>{status ?? "—"}</span>;
}

export function KindBadge({ kind, compact }: { kind: MappingKind; compact?: boolean }) {
  const fallback = kind === "fallback";
  const Icon = fallback ? Layers : Target;
  return (
    <span className={cn("inline-flex h-5 items-center gap-1 rounded-sm border px-1.5 text-[11px] font-medium", fallback ? "border-fallback/30 text-fallback" : "border-info/30 text-info")}>
      <Icon className="h-3 w-3" />
      {!compact && (fallback ? "Geral" : "Específico")}
    </span>
  );
}

export function PriorityPill({ value }: { value: number }) {
  return (
    <span className="inline-flex h-5 items-center gap-1 rounded-sm bg-secondary px-1.5 font-mono text-[11px] text-secondary-foreground" title="Número menor = maior prioridade">
      P{value}
    </span>
  );
}
