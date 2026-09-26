import { GapWorkbench } from "@/components/gaps/gap-workbench";
import { getGapWorkspace } from "@/lib/gaps/data";

type GapPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function GapPage({ params }: GapPageProps) {
  const { projectId } = await params;
  const gaps = await getGapWorkspace(projectId);

  return <GapWorkbench projectId={projectId} savedGaps={gaps} />;
}
