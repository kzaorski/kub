import { Box, RefreshCw, Clock, Server, Tag, Globe, Cpu, MemoryStick, Hash } from "lucide-react";
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

  // Get key labels (first 3, skipping system labels)
  const keyLabels = Object.entries(pod.labels)
    .filter(([key]) => !key.startsWith('pod-template-hash'))
    .slice(0, 3);

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
          <div className="flex items-center gap-2 text-muted-foreground">
            <Globe className="h-4 w-4" />
            <span className="truncate" title={pod.ip}>
              {pod.ip || "-"}
            </span>
          </div>
        </div>

        {/* CPU Usage, Request, Limit */}
        {(pod.cpuUsage > 0 || pod.cpuRequest > 0 || pod.cpuLimit > 0) && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
              <Cpu className="h-3 w-3" />
              <span>CPU</span>
            </div>
            <div className="flex gap-4 text-xs">
              {pod.cpuUsage > 0 && (
                <span className="text-muted-foreground">Usage: {formatMillicores(pod.cpuUsage)}</span>
              )}
              {pod.cpuRequest > 0 && (
                <span className="text-muted-foreground">Request: {formatMillicores(pod.cpuRequest)}</span>
              )}
              {pod.cpuLimit > 0 && (
                <span className="text-muted-foreground">Limit: {formatMillicores(pod.cpuLimit)}</span>
              )}
            </div>
          </div>
        )}

        {/* Memory Usage, Request, Limit */}
        {(pod.memoryUsage > 0 || pod.memoryRequest > 0 || pod.memoryLimit > 0) && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
              <MemoryStick className="h-3 w-3" />
              <span>Memory</span>
            </div>
            <div className="flex gap-4 text-xs">
              {pod.memoryUsage > 0 && (
                <span className="text-muted-foreground">Usage: {formatBytes(pod.memoryUsage)}</span>
              )}
              {pod.memoryRequest > 0 && (
                <span className="text-muted-foreground">Request: {formatBytes(pod.memoryRequest)}</span>
              )}
              {pod.memoryLimit > 0 && (
                <span className="text-muted-foreground">Limit: {formatBytes(pod.memoryLimit)}</span>
              )}
            </div>
          </div>
        )}

        {/* Containers */}
        {pod.containers.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
              <Tag className="h-3 w-3" />
              <span>Containers ({pod.containers.length})</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {pod.containers.map((container) => (
                <Badge
                  key={container.name}
                  variant={container.ready ? "success" : "warning"}
                  className="text-xs"
                  title={`Image: ${container.image}\nState: ${container.state}`}
                >
                  {container.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Labels */}
        {keyLabels.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
              <Hash className="h-3 w-3" />
              <span>Labels</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {keyLabels.map(([key, value]) => (
                <Badge key={key} variant="outline" className="text-xs font-mono">
                  {key}={value}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
