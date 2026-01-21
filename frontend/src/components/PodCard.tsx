import { Box, RefreshCw, Clock, Server, Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, getStatusColor, formatBytes, formatMillicores } from "@/lib/utils";
import type { Pod } from "@/types/k8s";

interface PodCardProps {
  pod: Pod & { animationClass?: string };
}

export function PodCard({ pod }: PodCardProps) {
  const getStatusVariant = (
    status: string
  ): "default" | "success" | "warning" | "error" | "secondary" => {
    const normalizedStatus = status.toLowerCase();
    if (normalizedStatus === "running") return "success";
    if (normalizedStatus === "pending") return "warning";
    if (
      normalizedStatus === "failed" ||
      normalizedStatus === "error" ||
      normalizedStatus.includes("crash")
    )
      return "error";
    return "secondary";
  };

  return (
    <Card
      className={cn(
        "transition-all duration-300 hover:shadow-md",
        pod.animationClass
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "h-3 w-3 rounded-full",
                getStatusColor(pod.status)
              )}
            />
            <div>
              <h3 className="font-medium text-sm">{pod.name}</h3>
              <p className="text-xs text-muted-foreground">{pod.namespace}</p>
            </div>
          </div>
          <Badge variant={getStatusVariant(pod.status)}>{pod.status}</Badge>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Box className="h-4 w-4" />
            <span>Ready: {pod.ready}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <RefreshCw className="h-4 w-4" />
            <span>Restarts: {pod.restarts}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Age: {pod.age}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Server className="h-4 w-4" />
            <span className="truncate" title={pod.node}>
              {pod.node || "-"}
            </span>
          </div>
        </div>

        {(pod.cpuUsage > 0 || pod.memoryUsage > 0) && (
          <div className="mt-3 pt-3 border-t flex gap-4 text-xs text-muted-foreground">
            <span>CPU: {formatMillicores(pod.cpuUsage)}</span>
            <span>Memory: {formatBytes(pod.memoryUsage)}</span>
          </div>
        )}

        {pod.containers.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
              <Tag className="h-3 w-3" />
              <span>Containers</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {pod.containers.map((container) => (
                <Badge
                  key={container.name}
                  variant={container.ready ? "success" : "warning"}
                  className="text-xs"
                >
                  {container.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
