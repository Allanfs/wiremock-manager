import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { MappingForm } from "@/components/wm/MappingForm";
import { ErrorState, LoadingState, PageHeader } from "@/components/wm/page";
import { emptyForm, formFromServeEvent, mappingToForm } from "@/lib/wiremock/form-model";
import { useMappings, useRequests, useSaveMapping } from "@/lib/wiremock/hooks";
import { mappingId } from "@/lib/wiremock/transform";

type Search = { duplicate?: string; fromRequest?: string; kind?: "fallback" | "specific" };

export const Route = createFileRoute("/mappings/new")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    duplicate: typeof s.duplicate === "string" ? s.duplicate : undefined,
    fromRequest: typeof s.fromRequest === "string" ? s.fromRequest : undefined,
    kind: s.kind === "fallback" || s.kind === "specific" ? s.kind : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Novo Mapping · WireMock Manager" },
      { name: "description", content: "Crie um stub mapping visualmente, sem escrever JSON." },
      { property: "og:title", content: "Novo Mapping · WireMock Manager" },
      { property: "og:description", content: "Crie um stub mapping visualmente, sem escrever JSON." },
    ],
  }),
  component: NewMapping,
});

function NewMapping() {
  const { duplicate, fromRequest, kind } = Route.useSearch();
  const navigate = useNavigate();
  const save = useSaveMapping();
  const mappings = useMappings();
  const requests = useRequests();

  const needsMappings = !!duplicate;
  const needsRequests = !!fromRequest;
  if ((needsMappings && mappings.isPending) || (needsRequests && requests.isPending)) return <LoadingState />;
  if (needsMappings && mappings.isError) return <ErrorState error={mappings.error} />;

  let initial = emptyForm(kind ?? "specific");
  let subtitle = "Defina a requisição esperada e a resposta simulada.";
  if (duplicate) {
    const src = mappings.data?.find((m) => mappingId(m) === duplicate);
    if (src) {
      initial = { ...mappingToForm(src), uuid: "", name: `${src.name ?? "Mapping"} (cópia)`, metadata: {} };
      subtitle = "Duplicando um mapping existente.";
    }
  }
  if (fromRequest) {
    const ev = requests.data?.find((r) => r.id === fromRequest);
    if (ev) {
      initial = formFromServeEvent(ev);
      subtitle = "Baseado em uma requisição do Request Journal.";
    }
  }

  return (
    <div>
      <PageHeader title={kind === "fallback" ? "Nova regra de fallback" : "Novo Mapping"} description={subtitle} />
      <MappingForm
        key={`${duplicate}-${fromRequest}-${kind}`}
        initial={initial}
        submitting={save.isPending}
        onSubmit={(mapping) =>
          save.mutate(
            { mapping },
            { onSuccess: (created) => navigate({ to: created && mappingId(created) ? "/mappings/$id" : "/mappings", params: { id: mappingId(created ?? mapping) } }) },
          )
        }
      />
    </div>
  );
}
