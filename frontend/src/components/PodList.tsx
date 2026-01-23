import { memo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import { PodCard } from "./PodCard";
import { LogViewer } from "./LogViewer";
import { podColumns } from "./pods/columns";
import type { Pod } from "@/types/k8s";

interface PodListProps {
  pods: (Pod & { animationClass?: string })[];
  isLoading: boolean;
}

export const PodList = memo(function PodList({ pods, isLoading }: PodListProps) {
  const [logViewerPod, setLogViewerPod] = useState<Pod | null>(null);

  const handleViewLogs = (pod: Pod) => {
    setLogViewerPod(pod);
  };

  const handleCloseLogViewer = () => {
    setLogViewerPod(null);
  };
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-lg" />
        ))}
      </div>
    );
  }

  if (pods.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-4xl mb-4">🫙</div>
        <h3 className="text-lg font-medium">No pods found</h3>
        <p className="text-sm text-muted-foreground">
          There are no pods in this namespace
        </p>
      </div>
    );
  }

  return (
    <>
      <DataTable
        columns={podColumns}
        data={pods}
        searchKey="name"
        searchPlaceholder="Filter pods..."
        renderExpandedRow={(pod, onClose) => (
          <PodCard pod={pod} onClose={onClose} onViewLogs={handleViewLogs} />
        )}
      />
      {logViewerPod && (
        <LogViewer
          pod={logViewerPod}
          open={!!logViewerPod}
          onClose={handleCloseLogViewer}
        />
      )}
    </>
  );
});
