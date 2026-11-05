import { useMemo, useRef } from "react";
import { AlignLeft, CheckCircle2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function highlightJson(src: string): string {
  return escapeHtml(src).replace(
    /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    (m, str, colon, lit, num) => {
      if (str) return colon ? `<span class="text-code-key">${str}</span>${colon}` : `<span class="text-code-string">${str}</span>`;
      if (lit) return `<span class="text-code-literal">${lit}</span>`;
      if (num) return `<span class="text-code-number">${num}</span>`;
      return m;
    },
  );
}

export function JsonView({ value, className }: { value: unknown; className?: string }) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  let html: string;
  try {
    html = highlightJson(typeof value === "string" ? JSON.stringify(JSON.parse(value), null, 2) : text);
  } catch {
    html = escapeHtml(text ?? "");
  }
  return <pre className={cn("scrollbar-thin overflow-auto rounded-md border bg-background p-3 font-mono text-[12px] leading-5", className)} dangerouslySetInnerHTML={{ __html: html || "<span class='text-muted-foreground'>(vazio)</span>" }} />;
}

type Props = { value: string; onChange: (v: string) => void; mode?: "json" | "text"; minRows?: number; placeholder?: string };

/** Lightweight code editor: transparent textarea over a highlighted <pre>. */
export function CodeEditor({ value, onChange, mode = "json", minRows = 10, placeholder }: Props) {
  const preRef = useRef<HTMLPreElement>(null);
  const status = useMemo(() => {
    if (mode !== "json" || !value.trim()) return null;
    try {
      JSON.parse(value);
      return { ok: true, msg: "JSON válido" };
    } catch (e) {
      return { ok: false, msg: (e as Error).message };
    }
  }, [value, mode]);

  const html = mode === "json" ? highlightJson(value) : escapeHtml(value);
  const height = `${Math.max(minRows, value.split("\n").length + 1) * 20 + 24}px`;

  return (
    <div className="overflow-hidden rounded-md border bg-background focus-within:ring-1 focus-within:ring-ring">
      <div className="flex items-center justify-between border-b bg-muted/40 px-2 py-1">
        <span className="font-mono text-[11px] uppercase text-muted-foreground">{mode}</span>
        <div className="flex items-center gap-2">
          {status && (
            <span className={cn("flex items-center gap-1 text-[11px]", status.ok ? "text-success" : "text-destructive")}>
              {status.ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
              <span className="max-w-[260px] truncate">{status.msg}</span>
            </span>
          )}
          {mode === "json" && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[11px]"
              disabled={!status?.ok}
              onClick={() => onChange(JSON.stringify(JSON.parse(value), null, 2))}
            >
              <AlignLeft className="h-3 w-3" /> Formatar
            </Button>
          )}
        </div>
      </div>
      <div className="relative max-h-[480px] overflow-auto scrollbar-thin" style={{ height }}>
        <pre ref={preRef} aria-hidden className="pointer-events-none absolute inset-0 m-0 whitespace-pre-wrap break-words p-3 font-mono text-[12px] leading-5" dangerouslySetInnerHTML={{ __html: html + "\n" }} />
        <textarea
          spellCheck={false}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Tab") {
              e.preventDefault();
              const t = e.currentTarget;
              const s = t.selectionStart;
              const next = value.slice(0, s) + "  " + value.slice(t.selectionEnd);
              onChange(next);
              requestAnimationFrame(() => t.setSelectionRange(s + 2, s + 2));
            }
          }}
          className="absolute inset-0 h-full w-full resize-none whitespace-pre-wrap break-words bg-transparent p-3 font-mono text-[12px] leading-5 text-transparent caret-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>
    </div>
  );
}
