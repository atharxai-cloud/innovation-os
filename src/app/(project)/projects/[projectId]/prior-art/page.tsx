import { PriorArtWorkbench } from "@/components/prior-art/prior-art-workbench";
import { getPriorArtWorkspace } from "@/lib/prior-art/data";

type PriorArtPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function PriorArtPage({ params }: PriorArtPageProps) {
  const { projectId } = await params;
  const data = await getPriorArtWorkspace(projectId);

  return (
    <PriorArtWorkbench
      projectId={projectId}
      savedItems={data.items}
      savedSources={data.sources}
    />
  );
}
