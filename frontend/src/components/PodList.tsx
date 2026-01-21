import { PodCard } from "./PodCard";
import type { Pod } from "@/types/k8s";

interface PodListProps {
  pods: (Pod & { animationClass?: string })[];
  isLoading: boolean;
}

export function PodList({ pods, isLoading }: PodListProps) {
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

  // Sort pods: Running first, then by name
  const sortedPods = [...pods].sort((a, b) => {
    const statusOrder: Record<string, number> = {
      Running: 0,
      Pending: 1,
      Terminating: 2,
      Failed: 3,
    };
    const aOrder = statusOrder[a.status] ?? 4;
    const bOrder = statusOrder[b.status] ?? 4;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {sortedPods.map((pod) => (
        <PodCard key={`${pod.namespace}/${pod.name}`} pod={pod} />
      ))}
    </div>
  );
}
