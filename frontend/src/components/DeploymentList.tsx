import { DeploymentCard } from "./DeploymentCard";
import type { Deployment } from "@/types/k8s";

interface DeploymentListProps {
  deployments: (Deployment & { animationClass?: string })[];
  isLoading: boolean;
}

export function DeploymentList({ deployments, isLoading }: DeploymentListProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-40 rounded-lg border bg-card animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (deployments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-4xl mb-4">📦</div>
        <h3 className="text-lg font-medium">No deployments found</h3>
        <p className="text-sm text-muted-foreground">
          There are no deployments in this namespace
        </p>
      </div>
    );
  }

  // Sort deployments: ready first, then by name
  const sortedDeployments = [...deployments].sort((a, b) => {
    const aReady = a.readyReplicas === a.replicas && a.replicas > 0;
    const bReady = b.readyReplicas === b.replicas && b.replicas > 0;
    if (aReady && !bReady) return -1;
    if (!aReady && bReady) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {sortedDeployments.map((deployment) => (
        <DeploymentCard key={`${deployment.namespace}/${deployment.name}`} deployment={deployment} />
      ))}
    </div>
  );
}
