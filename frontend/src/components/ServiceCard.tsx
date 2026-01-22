import { Network, Globe, Clock, Hash } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Service } from "@/types/k8s";

interface ServiceCardProps {
  service: Service & { animationClass?: string };
}

export function ServiceCard({ service }: ServiceCardProps) {
  const getTypeVariant = (): "default" | "success" | "warning" | "error" | "secondary" => {
    const type = service.type.toLowerCase();
    if (type === "clusterip") return "secondary";
    if (type === "nodeport") return "warning";
    if (type === "loadbalancer") return "success";
    return "default";
  };

  // Get selector labels
  const selectorEntries = Object.entries(service.selector || {}).slice(0, 3);

  return (
    <Card
      className={cn(
        "transition-all duration-300 hover:shadow-md",
        service.animationClass
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-blue-500" />
            <div>
              <h3 className="font-medium text-sm">{service.name}</h3>
              <p className="text-xs text-muted-foreground">{service.namespace}</p>
            </div>
          </div>
          <Badge variant={getTypeVariant()}>{service.type}</Badge>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Network className="h-4 w-4" />
            <span className="truncate" title={service.clusterIP}>
              {service.clusterIP || "-"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Age: {service.age}</span>
          </div>
        </div>

        {/* Ports */}
        {service.ports.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
              <Hash className="h-3 w-3" />
              <span>Ports</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {service.ports.map((port, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {port.name ? `${port.name}: ` : ""}{port.port}/{port.protocol}
                  {port.nodePort && ` (Node: ${port.nodePort})`}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* External IP */}
        {service.externalIP && service.externalIP !== "-" && (
          <div className="mt-3 pt-3 border-t flex items-center gap-2 text-sm text-muted-foreground">
            <Globe className="h-4 w-4" />
            <span className="truncate" title={service.externalIP}>
              {service.externalIP}
            </span>
          </div>
        )}

        {/* Selector */}
        {selectorEntries.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
              <Hash className="h-3 w-3" />
              <span>Selector</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {selectorEntries.map(([key, value]) => (
                <Badge key={key} variant="outline" className="text-xs font-mono">
                  {key}={value}
                </Badge>
              ))}
              {Object.keys(service.selector || {}).length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{Object.keys(service.selector || {}).length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
