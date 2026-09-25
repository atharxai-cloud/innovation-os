import { ProjectShell } from "@/components/project/project-shell";

export default async function ProjectLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}>) {
  const { projectId } = await params;

  return <ProjectShell projectId={projectId}>{children}</ProjectShell>;
}
