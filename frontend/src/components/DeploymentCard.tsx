import { Layers, RefreshCw, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Deployment } from "@/types/k8s";

interface DeploymentCardProps {
  deployment: Deployment & { animationClass?: string };
}

export function DeploymentCard({ deployment }: DeploymentCardProps) {
  const isReady = deployment.readyReplicas === deployment.replicas && deployment.replicas > 0;
  const isProgressing = deployment.readyReplicas < deployment.replicas && deployment.readyReplicas > 0;

  const getStatusVariant = (): "default" | "success" | "warning" | "error" | "secondary" => {
    if (isReady) return "success";
    if (isProgressing) return "warning";
    if (deployment.replicas === 0) return "secondary";
    return "error";
  };

  const getStatusText = () => {
    if (isReady) return "Ready";
    if (isProgressing) return "Progressing";
    if (deployment.replicas === 0) return "No replicas";
    return "Not Ready";
  };

  return (
    <Card
      className={cn(
        "transition-all duration-300 hover:shadow-md",
        deployment.animationClass
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "h-3 w-3 rounded-full",
                isReady ? "bg-green-500" : isProgressing ? "bg-yellow-500" : "bg-gray-400"
              )}
            />
            <div>
              <h3 className="font-medium text-sm">{deployment.name}</h3>
              <p className="text-xs text-muted-foreground">{deployment.namespace}</p>
            </div>
          </div>
          <Badge variant={getStatusVariant()}>{getStatusText()}</Badge>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Layers className="h-4 w-4" />
            <span>
              Ready: {deployment.readyReplicas}/{deployment.replicas}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <RefreshCw className="h-4 w-4" />
            <span>{deployment.strategy}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground col-span-2">
            <Clock className="h-4 w-4" />
            <span>Age: {deployment.age}</span>
          </div>
        </div>

        {(deployment.updatedReplicas < deployment.replicas || deployment.availableReplicas < deployment.replicas) && (
          <div className="mt-3 pt-3 border-t flex gap-4 text-xs text-muted-foreground">
            <span>Updated: {deployment.updatedReplicas}/{deployment.replicas}</span>
            <span>Available: {deployment.availableReplicas}/{deployment.replicas}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
