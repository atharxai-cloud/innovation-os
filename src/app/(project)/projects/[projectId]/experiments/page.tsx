import { ExperimentWorkbench } from "@/components/experiments/experiment-workbench";
import { getExperimentWorkspace } from "@/lib/experiments/data";

type ExperimentsPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ExperimentsPage({ params }: ExperimentsPageProps) {
  const { projectId } = await params;
  const data = await getExperimentWorkspace(projectId);

  return (
    <ExperimentWorkbench
      projectId={projectId}
      gaps={data.gaps}
      experiments={data.experiments}
      reviews={data.reviews}
    />
  );
}
