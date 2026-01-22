import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import { NodeCard } from "./NodeCard";
import { nodeColumns } from "./nodes/columns";
import type { Node } from "@/types/k8s";

interface NodeListProps {
  nodes: Node[];
  isLoading: boolean;
}

export function NodeList({ nodes, isLoading }: NodeListProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-lg" />
        ))}
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-4xl mb-4">
          <svg className="h-12 w-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
          </svg>
        </div>
        <h3 className="text-lg font-medium">No nodes found</h3>
        <p className="text-sm text-muted-foreground">
          Unable to retrieve cluster nodes
        </p>
      </div>
    );
  }

  return (
    <DataTable
      columns={nodeColumns}
      data={nodes}
      searchKey="name"
      searchPlaceholder="Filter nodes..."
      renderExpandedRow={(node) => <NodeCard node={node} />}
    />
  );
}
