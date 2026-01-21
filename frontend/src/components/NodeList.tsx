import { Server, Cpu, MemoryStick, Globe, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatBytes, formatMillicores } from "@/lib/utils";
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
          <div
            key={i}
            className="h-40 rounded-lg border bg-card animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-4xl mb-4">
          <Server className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium">No nodes found</h3>
        <p className="text-sm text-muted-foreground">
          Unable to retrieve cluster nodes
        </p>
      </div>
    );
  }

  const sortedNodes = [...nodes].sort((a, b) => {
    // Control plane nodes first, then by name
    const aIsControl = a.roles.includes("control-plane") || a.roles.includes("master");
    const bIsControl = b.roles.includes("control-plane") || b.roles.includes("master");
    if (aIsControl && !bIsControl) return -1;
    if (!aIsControl && bIsControl) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {sortedNodes.map((node) => (
        <NodeCard key={node.name} node={node} />
      ))}
    </div>
  );
}

function NodeCard({ node }: { node: Node }) {
  const getStatusVariant = (
    status: string
  ): "default" | "success" | "warning" | "error" | "secondary" => {
    if (status === "Ready") return "success";
    if (status === "NotReady") return "error";
    return "warning";
  };

  const getStatusColor = (status: string) => {
    if (status === "Ready") return "bg-green-500";
    if (status === "NotReady") return "bg-red-500";
    return "bg-yellow-500";
  };

  return (
    <Card className="transition-all duration-300 hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("h-3 w-3 rounded-full", getStatusColor(node.status))} />
            <div>
              <h3 className="font-medium text-sm">{node.name}</h3>
              <div className="flex gap-1 mt-1">
                {node.roles.map((role) => (
                  <Badge key={role} variant="secondary" className="text-xs">
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <Badge variant={getStatusVariant(node.status)}>{node.status}</Badge>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Globe className="h-4 w-4" />
            <span className="truncate" title={node.internalIP}>
              {node.internalIP || "-"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{node.version}</span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Cpu className="h-4 w-4" />
              <span>
                {node.cpuPercent !== undefined
                  ? `${node.cpuPercent.toFixed(1)}%`
                  : formatMillicores(node.cpuCapacity)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MemoryStick className="h-4 w-4" />
              <span>
                {node.memoryPercent !== undefined
                  ? `${node.memoryPercent.toFixed(1)}%`
                  : formatBytes(node.memoryCapacity)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-2 text-xs text-muted-foreground">
          {node.os} ({node.architecture})
        </div>
      </CardContent>
    </Card>
  );
}
