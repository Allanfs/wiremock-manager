import { createFileRoute } from "@tanstack/react-router";

import { MappingForm } from "@/components/wm/MappingForm";
import { ErrorState, LoadingState, PageHeader } from "@/components/wm/page";
import { mappingToForm } from "@/lib/wiremock/form-model";
import { useMapping, useSaveMapping } from "@/lib/wiremock/hooks";
import { mappingId } from "@/lib/wiremock/transform";

export const Route = createFileRoute("/mappings/$id")({
  head: () => ({
    meta: [
      { title: "Editar Mapping · WireMock Manager" },
      { name: "description", content: "Edite request matcher, resposta e configurações avançadas de um stub." },
      { property: "og:title", content: "Editar Mapping · WireMock Manager" },
      { property: "og:description", content: "Edite request matcher, resposta e configurações avançadas de um stub." },
    ],
  }),
  component: EditMapping,
});

function EditMapping() {
  const { id } = Route.useParams();
  const q = useMapping(id);
  const save = useSaveMapping();

  if (q.isPending) return <LoadingState />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;

  return (
    <div>
      <PageHeader title={q.data.name || "Editar Mapping"} description={<span className="font-mono text-xs">{mappingId(q.data)}</span>} />
      <MappingForm key={q.dataUpdatedAt} isEdit initial={mappingToForm(q.data)} submitting={save.isPending} onSubmit={(mapping) => save.mutate({ id, mapping })} />
    </div>
  );
}
