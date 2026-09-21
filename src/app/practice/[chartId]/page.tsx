import { getChart } from "@/lib/workspace-api";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";

export default async function PracticePage({
  params,
}: {
  params: Promise<{ chartId: string }>;
}) {
  const { chartId } = await params;
  const chart = await getChart(chartId);

  return <WorkspaceShell chart={chart} />;
}
