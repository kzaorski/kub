import { memo, useState } from "react";
import { ChevronDown, ChevronRight, Box, Terminal, Lock, HardDrive } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, getContainerStatusVariant } from "@/lib/utils";
import type { Container } from "@/types/k8s";

interface ContainerSectionProps {
  containers: Container[];
}

export const ContainerSection = memo(function ContainerSection({ containers }: ContainerSectionProps) {
  const [expandedContainers, setExpandedContainers] = useState<Set<string>>(new Set([containers[0]?.name]));

  const toggleContainer = (name: string) => {
    setExpandedContainers(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  if (!containers || containers.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-2">
        No containers
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {containers.map((container) => {
        const isExpanded = expandedContainers.has(container.name);

        return (
          <div key={container.name} className="border rounded-md overflow-hidden">
            <button
              onClick={() => toggleContainer(container.name)}
              className="w-full p-2 flex items-center gap-2 hover:bg-accent/50 transition-colors text-left"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0" />
              )}
              <Box className="h-4 w-4 shrink-0" />
              <span className="font-medium text-sm truncate flex-1">{container.name}</span>
              <Badge variant={getContainerStatusVariant(container.state)} className="text-xs">
                {container.state}
              </Badge>
            </button>

            {isExpanded && (
              <div className="px-4 pb-3 space-y-3 text-sm border-t">
                {/* Image */}
                <div className="pt-2">
                  <span className="text-muted-foreground">Image:</span>
                  <code className="ml-2 text-xs bg-muted px-1 py-0.5 rounded break-all">
                    {container.image}
                  </code>
                </div>

                {/* State Details */}
                {container.stateDetails && (
                  <div>
                    <span className="text-muted-foreground">State Details:</span>
                    <span className="ml-2 text-xs">{container.stateDetails}</span>
                  </div>
                )}

                {/* Restart Count */}
                <div>
                  <span className="text-muted-foreground">Restarts:</span>
                  <span className={cn("ml-2", container.restartCount > 0 && "text-yellow-500")}>
                    {container.restartCount}
                  </span>
                </div>

                {/* Resources */}
                {container.resources && (
                  <div>
                    <span className="text-muted-foreground">Resources:</span>
                    <div className="ml-4 mt-1 text-xs space-y-1">
                      {(container.resources.requestsCpu || container.resources.requestsMemory) && (
                        <div>
                          Requests: {container.resources.requestsCpu || '-'} CPU, {container.resources.requestsMemory || '-'} Memory
                        </div>
                      )}
                      {(container.resources.limitsCpu || container.resources.limitsMemory) && (
                        <div>
                          Limits: {container.resources.limitsCpu || '-'} CPU, {container.resources.limitsMemory || '-'} Memory
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Ports */}
                {container.ports && container.ports.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">Ports:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {container.ports.map((port, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {port.name ? `${port.name}: ` : ''}{port.containerPort}/{port.protocol}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Command */}
                {container.command && container.command.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Terminal className="h-3 w-3" />
                      <span>Command:</span>
                    </div>
                    <code className="block ml-4 mt-1 text-xs bg-muted p-1 rounded overflow-x-auto">
                      {container.command.join(' ')}
                    </code>
                  </div>
                )}

                {/* Volume Mounts */}
                {container.volumeMounts && container.volumeMounts.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <HardDrive className="h-3 w-3" />
                      <span>Volume Mounts:</span>
                    </div>
                    <div className="ml-4 mt-1 text-xs space-y-1">
                      {container.volumeMounts.slice(0, 5).map((mount, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="font-mono">{mount.mountPath}</span>
                          <span className="text-muted-foreground">from {mount.name}</span>
                          {mount.readOnly && (
                            <Badge variant="outline" className="text-xs">RO</Badge>
                          )}
                        </div>
                      ))}
                      {container.volumeMounts.length > 5 && (
                        <div className="text-muted-foreground">
                          +{container.volumeMounts.length - 5} more
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Environment Variables */}
                {container.env && container.env.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">Environment ({container.env.length} vars):</span>
                    <div className="ml-4 mt-1 text-xs space-y-1 max-h-32 overflow-y-auto">
                      {container.env.slice(0, 10).map((env, idx) => (
                        <div key={idx} className="font-mono">
                          <span className="text-muted-foreground">{env.name}=</span>
                          <span>
                            {env.value || (env.valueFrom ? `<${env.valueFrom}>` : '')}
                          </span>
                        </div>
                      ))}
                      {container.env.length > 10 && (
                        <div className="text-muted-foreground">
                          +{container.env.length - 10} more
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Security Context */}
                {container.securityContext && (
                  <div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Lock className="h-3 w-3" />
                      <span>Security Context:</span>
                    </div>
                    <div className="ml-4 mt-1 text-xs space-y-1">
                      {container.securityContext.runAsUser !== undefined && (
                        <div>Run as User: {container.securityContext.runAsUser}</div>
                      )}
                      {container.securityContext.runAsNonRoot !== undefined && (
                        <div>Run as Non-Root: {container.securityContext.runAsNonRoot ? 'Yes' : 'No'}</div>
                      )}
                      {container.securityContext.readOnlyRootFilesystem !== undefined && (
                        <div>Read-Only FS: {container.securityContext.readOnlyRootFilesystem ? 'Yes' : 'No'}</div>
                      )}
                      {container.securityContext.privileged !== undefined && (
                        <div className={container.securityContext.privileged ? 'text-red-500' : ''}>
                          Privileged: {container.securityContext.privileged ? 'Yes' : 'No'}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});
