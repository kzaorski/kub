import { memo, useMemo } from "react";
import { Box, RefreshCw, Clock, Server, Tag, Globe, Cpu, MemoryStick, Hash, X, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResourceBar } from "@/components/ResourceBar";
import { cn, getStatusColor, formatBytes, formatMillicores, getPodStatusVariant, getContainerStatusVariant } from "@/lib/utils";
import type { Pod } from "@/types/k8s";

interface PodCardProps {
  pod: Pod & { animationClass?: string };
  onClose?: () => void;
  onViewLogs?: (pod: Pod) => void;
}

export const PodCard = memo(function PodCard({ pod, onClose, onViewLogs }: PodCardProps) {
  // Container state summary
  const containerSummary = useMemo(() => {
    const counts: Record<string, number> = {};
    (pod.containers || []).forEach((c) => {
      counts[c.state] = (counts[c.state] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([state, count]) => `${count} ${state}`)
      .join(", ");
  }, [pod.containers]);

  // Get key labels (first 3, skipping system labels)
  const keyLabels = Object.entries(pod.labels || {})
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
          <div className="flex items-center gap-2">
            <Badge variant={getPodStatusVariant(pod.status)}>{pod.status}</Badge>
            {onViewLogs && (
              <button
                onClick={() => onViewLogs(pod)}
                className="h-6 w-6 rounded-md hover:bg-accent flex items-center justify-center transition-colors"
                title="View Logs"
              >
                <FileText className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="h-6 w-6 rounded-md hover:bg-accent flex items-center justify-center transition-colors"
                title="Close"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
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

        {/* CPU & Memory Usage */}
        <div className="mt-3 pt-3 border-t space-y-2">
          <ResourceBar
            label="CPU"
            icon={<Cpu className="h-3 w-3" />}
            usage={pod.cpuUsage}
            request={pod.cpuRequest}
            limit={pod.cpuLimit}
            formatFn={formatMillicores}
          />
          <ResourceBar
            label="Memory"
            icon={<MemoryStick className="h-3 w-3" />}
            usage={pod.memoryUsage}
            request={pod.memoryRequest}
            limit={pod.memoryLimit}
            formatFn={formatBytes}
          />
        </div>

        {/* Containers */}
        {pod.containers && pod.containers.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
              <Tag className="h-3 w-3" />
              <span>Containers: {containerSummary}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {pod.containers.map((container) => (
                <Badge
                  key={container.name}
                  variant={getContainerStatusVariant(container.state)}
                  className="text-xs"
                  title={`Image: ${container.image}`}
                >
                  {container.name}: {container.state}
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
});
