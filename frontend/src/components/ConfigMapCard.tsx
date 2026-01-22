import { Clock, Hash, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ConfigMap } from "@/types/k8s";

interface ConfigMapCardProps {
  configmap: ConfigMap & { animationClass?: string };
  onClose?: () => void;
}

export function ConfigMapCard({ configmap, onClose }: ConfigMapCardProps) {
  return (
    <Card
      className={cn(
        "transition-all duration-300 hover:shadow-md",
        configmap.animationClass
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-purple-500" />
            <div>
              <h3 className="font-medium text-sm">{configmap.name}</h3>
              <p className="text-xs text-muted-foreground">{configmap.namespace}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{configmap.dataCount} {configmap.dataCount === 1 ? 'key' : 'keys'}</Badge>
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
          <div className="flex items-center gap-2 text-muted-foreground col-span-2">
            <Clock className="h-4 w-4" />
            <span>Age: {configmap.age}</span>
          </div>
        </div>

        {configmap.keys.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
              <Hash className="h-3 w-3" />
              <span>Keys</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {configmap.keys.slice(0, 5).map((key, idx) => (
                <Badge key={idx} variant="outline" className="text-xs font-mono">
                  {key}
                </Badge>
              ))}
              {configmap.keys.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{configmap.keys.length - 5} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
