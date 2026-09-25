import { EvidenceWorkbench } from "@/components/evidence/evidence-workbench";
import { getEvidenceWorkspace } from "@/lib/research/data";

type EvidencePageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function EvidencePage({ params }: EvidencePageProps) {
  const { projectId } = await params;
  const data = await getEvidenceWorkspace(projectId);

  return (
    <EvidenceWorkbench
      projectId={projectId}
      initialClaims={data.claims}
      savedSources={data.sources}
    />
  );
}
