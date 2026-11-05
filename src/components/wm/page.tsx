import { AlertTriangle, Loader2, PlugZap } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { describeError } from "@/lib/wiremock/errors";

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b px-6 py-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function LoadingState({ label = "Carregando…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 px-6 py-10 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="m-6 flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-4">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <div className="flex-1 text-sm">
        <p className="font-medium">{describeError(error)}</p>
        <p className="mt-1 text-muted-foreground">Confira a URL e o token em Settings, ou ative o modo Demo para explorar a interface.</p>
        <div className="mt-3 flex gap-2">
          {onRetry && (
            <Button size="sm" variant="secondary" onClick={onRetry}>
              Tentar novamente
            </Button>
          )}
          <Button size="sm" variant="outline" asChild>
            <Link to="/settings">
              <PlugZap className="h-3.5 w-3.5" /> Settings
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      {icon && <div className="text-muted-foreground">{icon}</div>}
      <p className="font-medium">{title}</p>
      {children && <div className="max-w-md text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

export function Section({ title, description, children, actions }: { title: string; description?: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="rounded-md border bg-card">
      <header className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
        <div>
          <h2 className="text-[13px] font-semibold">{title}</h2>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}
