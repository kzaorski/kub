import { memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import { DeploymentCard } from "./DeploymentCard";
import { deploymentColumns } from "./deployments/columns";
import type { Deployment } from "@/types/k8s";

interface DeploymentListProps {
  deployments: (Deployment & { animationClass?: string })[];
  isLoading: boolean;
}

export const DeploymentList = memo(function DeploymentList({ deployments, isLoading }: DeploymentListProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-lg" />
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

  return (
    <DataTable
      columns={deploymentColumns}
      data={deployments}
      searchKey="name"
      searchPlaceholder="Filter deployments..."
      renderExpandedRow={(deployment, onClose) => <DeploymentCard deployment={deployment} onClose={onClose} />}
    />
  );
});
