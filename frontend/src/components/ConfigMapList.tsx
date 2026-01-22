import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import { ConfigMapCard } from "./ConfigMapCard";
import { configmapColumns } from "./configmaps/columns";
import type { ConfigMap } from "@/types/k8s";

interface ConfigMapListProps {
  configmaps: (ConfigMap & { animationClass?: string })[];
  isLoading: boolean;
}

export function ConfigMapList({ configmaps, isLoading }: ConfigMapListProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-lg" />
        ))}
      </div>
    );
  }

  if (configmaps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-4xl mb-4">📄</div>
        <h3 className="text-lg font-medium">No configmaps found</h3>
        <p className="text-sm text-muted-foreground">
          There are no configmaps in this namespace
        </p>
      </div>
    );
  }

  return (
    <DataTable
      columns={configmapColumns}
      data={configmaps}
      searchKey="name"
      searchPlaceholder="Filter configmaps..."
      renderExpandedRow={(configmap, onClose) => <ConfigMapCard configmap={configmap} onClose={onClose} />}
    />
  );
}
