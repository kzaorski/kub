import { memo, useState, useEffect, useCallback } from "react";
import { X, ChevronDown, ChevronRight, RefreshCw, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EventsSection } from "@/components/describe/EventsSection";
import { ConditionsSection } from "@/components/describe/ConditionsSection";
import { LabelsSection } from "@/components/describe/LabelsSection";
import { ContainerSection } from "@/components/describe/ContainerSection";
import { VolumeSection } from "@/components/describe/VolumeSection";
import { cn } from "@/lib/utils";
import { getApiUrl } from "@/lib/api";
import type { Pod, Node, Deployment, Service, ConfigMap, Event, DescribableResource, Endpoint } from "@/types/k8s";

type ResourceData = Pod | Node | Deployment | Service | ConfigMap;

interface DescribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceType: DescribableResource;
  resource: ResourceData;
  namespace?: string;
}

interface Section {
  id: string;
  title: string;
  defaultOpen?: boolean;
}

export const DescribeModal = memo(function DescribeModal({
  isOpen,
  onClose,
  resourceType,
  resource,
  namespace
}: DescribeModalProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['metadata', 'status', 'containers', 'events'])
  );
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [endpoints, setEndpoints] = useState<Endpoint | null>(null);
  const [endpointsLoading, setEndpointsLoading] = useState(false);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const getResourceName = (): string => {
    return (resource as { name: string }).name;
  };

  const getResourceNamespace = (): string => {
    if (resourceType === 'Node') return '';
    return namespace || (resource as { namespace?: string }).namespace || 'default';
  };

  const fetchEvents = useCallback(async () => {
    const ns = getResourceNamespace();
    const name = getResourceName();

    // For nodes, events are cluster-scoped but tied to the node name
    const eventNs = resourceType === 'Node' ? 'default' : ns;

    setEventsLoading(true);
    try {
      const response = await fetch(getApiUrl(`/api/events/${eventNs}/${resourceType}/${name}`));
      if (response.ok) {
        const data = await response.json();
        setEvents(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setEventsLoading(false);
    }
  }, [resourceType, resource, namespace]);

  const fetchEndpoints = useCallback(async () => {
    if (resourceType !== 'Service') return;

    const ns = getResourceNamespace();
    const name = getResourceName();

    setEndpointsLoading(true);
    try {
      const response = await fetch(getApiUrl(`/api/services/${ns}/${name}/endpoints`));
      if (response.ok) {
        const data = await response.json();
        setEndpoints(data);
      }
    } catch (error) {
      console.error('Failed to fetch endpoints:', error);
    } finally {
      setEndpointsLoading(false);
    }
  }, [resourceType, resource, namespace]);

  useEffect(() => {
    if (isOpen) {
      fetchEvents();
      if (resourceType === 'Service') {
        fetchEndpoints();
      }
    }
  }, [isOpen, fetchEvents, fetchEndpoints, resourceType]);

  if (!isOpen) return null;

  const sections = getSectionsForResource(resourceType);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-background border rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs">
              {resourceType}
            </Badge>
            <h2 className="text-lg font-semibold truncate">
              {getResourceName()}
            </h2>
            {getResourceNamespace() && (
              <span className="text-sm text-muted-foreground">
                in {getResourceNamespace()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { fetchEvents(); if (resourceType === 'Service') fetchEndpoints(); }}
              className="p-2 hover:bg-accent rounded-md transition-colors"
              title="Refresh"
            >
              <RefreshCw className={cn("h-4 w-4", (eventsLoading || endpointsLoading) && "animate-spin")} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-accent rounded-md transition-colors"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {sections.map((section) => (
            <CollapsibleSection
              key={section.id}
              title={section.title}
              isOpen={expandedSections.has(section.id)}
              onToggle={() => toggleSection(section.id)}
            >
              {renderSectionContent(
                section.id,
                resourceType,
                resource,
                events,
                eventsLoading,
                endpoints,
                endpointsLoading
              )}
            </CollapsibleSection>
          ))}
        </div>
      </div>
    </div>
  );
});

interface CollapsibleSectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const CollapsibleSection = memo(function CollapsibleSection({
  title,
  isOpen,
  onToggle,
  children
}: CollapsibleSectionProps) {
  return (
    <div className="border rounded-md">
      <button
        onClick={onToggle}
        className="w-full p-3 flex items-center gap-2 hover:bg-accent/50 transition-colors text-left"
      >
        {isOpen ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
        <span className="font-medium text-sm">{title}</span>
      </button>
      {isOpen && (
        <div className="px-4 pb-3 border-t pt-3">
          {children}
        </div>
      )}
    </div>
  );
});

function getSectionsForResource(resourceType: DescribableResource): Section[] {
  const commonSections: Section[] = [
    { id: 'metadata', title: 'Metadata', defaultOpen: true },
    { id: 'events', title: 'Events', defaultOpen: true },
  ];

  switch (resourceType) {
    case 'Pod':
      return [
        { id: 'metadata', title: 'Metadata', defaultOpen: true },
        { id: 'status', title: 'Status & Conditions', defaultOpen: true },
        { id: 'containers', title: 'Containers', defaultOpen: true },
        { id: 'volumes', title: 'Volumes', defaultOpen: false },
        { id: 'scheduling', title: 'Scheduling', defaultOpen: false },
        { id: 'events', title: 'Events', defaultOpen: true },
      ];
    case 'Node':
      return [
        { id: 'metadata', title: 'Metadata', defaultOpen: true },
        { id: 'status', title: 'Status & Conditions', defaultOpen: true },
        { id: 'resources', title: 'Resources', defaultOpen: true },
        { id: 'system', title: 'System Info', defaultOpen: false },
        { id: 'taints', title: 'Taints', defaultOpen: false },
        { id: 'events', title: 'Events', defaultOpen: true },
      ];
    case 'Deployment':
      return [
        { id: 'metadata', title: 'Metadata', defaultOpen: true },
        { id: 'status', title: 'Status & Conditions', defaultOpen: true },
        { id: 'strategy', title: 'Strategy', defaultOpen: false },
        { id: 'events', title: 'Events', defaultOpen: true },
      ];
    case 'Service':
      return [
        { id: 'metadata', title: 'Metadata', defaultOpen: true },
        { id: 'spec', title: 'Specification', defaultOpen: true },
        { id: 'endpoints', title: 'Endpoints', defaultOpen: true },
        { id: 'events', title: 'Events', defaultOpen: true },
      ];
    case 'ConfigMap':
      return [
        { id: 'metadata', title: 'Metadata', defaultOpen: true },
        { id: 'data', title: 'Data', defaultOpen: true },
        { id: 'events', title: 'Events', defaultOpen: false },
      ];
    default:
      return commonSections;
  }
}

function renderSectionContent(
  sectionId: string,
  resourceType: DescribableResource,
  resource: ResourceData,
  events: Event[],
  eventsLoading: boolean,
  endpoints: Endpoint | null,
  endpointsLoading: boolean
): React.ReactNode {
  if (sectionId === 'events') {
    if (eventsLoading) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading events...
        </div>
      );
    }
    return <EventsSection events={events} />;
  }

  if (sectionId === 'metadata') {
    return (
      <LabelsSection
        labels={(resource as { labels?: Record<string, string> }).labels}
        annotations={(resource as { annotations?: Record<string, string> }).annotations}
      />
    );
  }

  switch (resourceType) {
    case 'Pod':
      return renderPodSection(sectionId, resource as Pod);
    case 'Node':
      return renderNodeSection(sectionId, resource as Node);
    case 'Deployment':
      return renderDeploymentSection(sectionId, resource as Deployment);
    case 'Service':
      return renderServiceSection(sectionId, resource as Service, endpoints, endpointsLoading);
    case 'ConfigMap':
      return renderConfigMapSection(sectionId, resource as ConfigMap);
    default:
      return null;
  }
}

function renderPodSection(sectionId: string, pod: Pod): React.ReactNode {
  switch (sectionId) {
    case 'status':
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Phase:</span>
              <span className="ml-2">{pod.phase}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Status:</span>
              <span className="ml-2">{pod.status}</span>
            </div>
            <div>
              <span className="text-muted-foreground">IP:</span>
              <span className="ml-2 font-mono">{pod.ip || '-'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Node:</span>
              <span className="ml-2">{pod.node || '-'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">QoS Class:</span>
              <span className="ml-2">{pod.qosClass || '-'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Service Account:</span>
              <span className="ml-2">{pod.serviceAccount || '-'}</span>
            </div>
          </div>
          {pod.conditions && pod.conditions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Conditions</h4>
              <ConditionsSection conditions={pod.conditions} />
            </div>
          )}
        </div>
      );
    case 'containers':
      return <ContainerSection containers={pod.containers} />;
    case 'volumes':
      return <VolumeSection volumes={pod.volumes || []} />;
    case 'scheduling':
      return (
        <div className="space-y-4 text-sm">
          {pod.nodeSelector && Object.keys(pod.nodeSelector).length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Node Selector</h4>
              <div className="flex flex-wrap gap-1">
                {Object.entries(pod.nodeSelector).map(([key, value]) => (
                  <Badge key={key} variant="outline" className="font-mono text-xs">
                    {key}={value}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {pod.tolerations && pod.tolerations.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Tolerations</h4>
              <div className="space-y-1">
                {pod.tolerations.map((t, idx) => (
                  <div key={idx} className="text-xs font-mono bg-muted p-1 rounded">
                    {t.key ? `${t.key}${t.operator === 'Equal' ? `=${t.value}` : ''}` : '<all>'}
                    {t.effect && `:${t.effect}`}
                  </div>
                ))}
              </div>
            </div>
          )}
          {pod.ownerReferences && pod.ownerReferences.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Owner References</h4>
              <div className="space-y-1">
                {pod.ownerReferences.map((ref, idx) => (
                  <div key={idx} className="text-xs">
                    <Badge variant="secondary">{ref.kind}</Badge>
                    <span className="ml-2">{ref.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    default:
      return null;
  }
}

function renderNodeSection(sectionId: string, node: Node): React.ReactNode {
  switch (sectionId) {
    case 'status':
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Status:</span>
              <Badge className="ml-2" variant={node.status === 'Ready' ? 'success' : 'error'}>
                {node.status}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Roles:</span>
              <span className="ml-2">{node.roles?.join(', ') || '-'}</span>
            </div>
          </div>
          {node.conditions && node.conditions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Conditions</h4>
              <ConditionsSection conditions={node.conditions} />
            </div>
          )}
        </div>
      );
    case 'resources':
      return (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium mb-2">CPU</h4>
            <div className="space-y-1 text-xs">
              <div>Capacity: {formatMillicores(node.cpuCapacity)}</div>
              <div>Allocatable: {formatMillicores(node.cpuAllocatable)}</div>
              {node.cpuUsage > 0 && <div>Usage: {formatMillicores(node.cpuUsage)} ({node.cpuPercent?.toFixed(1)}%)</div>}
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-2">Memory</h4>
            <div className="space-y-1 text-xs">
              <div>Capacity: {formatBytes(node.memoryCapacity)}</div>
              <div>Allocatable: {formatBytes(node.memoryAllocatable)}</div>
              {node.memoryUsage > 0 && <div>Usage: {formatBytes(node.memoryUsage)} ({node.memoryPercent?.toFixed(1)}%)</div>}
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-2">Pods</h4>
            <div className="text-xs">
              {node.podCount} / {node.podCapacity}
            </div>
          </div>
          {node.podCIDR && (
            <div>
              <h4 className="font-medium mb-2">Pod CIDR</h4>
              <div className="text-xs font-mono">{node.podCIDR}</div>
            </div>
          )}
        </div>
      );
    case 'system':
      return (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Kubernetes:</span>
            <span className="ml-2">{node.version}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Kernel:</span>
            <span className="ml-2">{node.kernelVersion}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Container Runtime:</span>
            <span className="ml-2">{node.containerRuntime}</span>
          </div>
          <div>
            <span className="text-muted-foreground">OS:</span>
            <span className="ml-2">{node.os}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Architecture:</span>
            <span className="ml-2">{node.architecture}</span>
          </div>
          {node.addresses && node.addresses.length > 0 && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Addresses:</span>
              <div className="mt-1 space-y-1">
                {node.addresses.map((addr, idx) => (
                  <div key={idx} className="text-xs">
                    <Badge variant="outline" className="mr-2">{addr.type}</Badge>
                    <span className="font-mono">{addr.address}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    case 'taints':
      return (
        <div className="space-y-2">
          {(!node.taints || node.taints.length === 0) ? (
            <p className="text-sm text-muted-foreground">No taints</p>
          ) : (
            node.taints.map((taint, idx) => (
              <div key={idx} className="text-sm border rounded p-2">
                <div className="font-mono">
                  {taint.key}{taint.value ? `=${taint.value}` : ''}
                </div>
                <Badge variant="secondary" className="mt-1 text-xs">{taint.effect}</Badge>
              </div>
            ))
          )}
        </div>
      );
    default:
      return null;
  }
}

function renderDeploymentSection(sectionId: string, deployment: Deployment): React.ReactNode {
  switch (sectionId) {
    case 'status':
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Replicas:</span>
              <span className="ml-2">{deployment.readyReplicas}/{deployment.replicas}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Updated:</span>
              <span className="ml-2">{deployment.updatedReplicas}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Available:</span>
              <span className="ml-2">{deployment.availableReplicas}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Age:</span>
              <span className="ml-2">{deployment.age}</span>
            </div>
          </div>
          {deployment.conditions && deployment.conditions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Conditions</h4>
              <ConditionsSection conditions={deployment.conditions} />
            </div>
          )}
        </div>
      );
    case 'strategy':
      return (
        <div className="space-y-4 text-sm">
          <div>
            <span className="text-muted-foreground">Strategy Type:</span>
            <span className="ml-2">{deployment.strategy}</span>
          </div>
          {deployment.strategy === 'RollingUpdate' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-muted-foreground">Max Surge:</span>
                <span className="ml-2">{deployment.maxSurge || '25%'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Max Unavailable:</span>
                <span className="ml-2">{deployment.maxUnavailable || '25%'}</span>
              </div>
            </div>
          )}
          {deployment.podTemplateImage && (
            <div>
              <span className="text-muted-foreground">Pod Template Image:</span>
              <code className="ml-2 text-xs bg-muted px-1 py-0.5 rounded">{deployment.podTemplateImage}</code>
            </div>
          )}
          {deployment.selector && Object.keys(deployment.selector).length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Selector</h4>
              <div className="flex flex-wrap gap-1">
                {Object.entries(deployment.selector).map(([key, value]) => (
                  <Badge key={key} variant="outline" className="font-mono text-xs">
                    {key}={value}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    default:
      return null;
  }
}

function renderServiceSection(
  sectionId: string,
  service: Service,
  endpoints: Endpoint | null,
  endpointsLoading: boolean
): React.ReactNode {
  switch (sectionId) {
    case 'spec':
      return (
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-muted-foreground">Type:</span>
              <Badge className="ml-2" variant="secondary">{service.type}</Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Cluster IP:</span>
              <span className="ml-2 font-mono">{service.clusterIP}</span>
            </div>
            {service.externalIP && service.externalIP !== '-' && (
              <div>
                <span className="text-muted-foreground">External IP:</span>
                <span className="ml-2 font-mono">{service.externalIP}</span>
              </div>
            )}
            {service.sessionAffinity && (
              <div>
                <span className="text-muted-foreground">Session Affinity:</span>
                <span className="ml-2">{service.sessionAffinity}</span>
              </div>
            )}
          </div>
          {service.ports && service.ports.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Ports</h4>
              <div className="space-y-1">
                {service.ports.map((port, idx) => (
                  <div key={idx} className="text-xs font-mono bg-muted p-2 rounded">
                    {port.name && <span className="text-muted-foreground">{port.name}: </span>}
                    {port.port} → {port.targetPort} ({port.protocol})
                    {port.nodePort && <span className="text-muted-foreground"> NodePort: {port.nodePort}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {service.selector && Object.keys(service.selector).length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Selector</h4>
              <div className="flex flex-wrap gap-1">
                {Object.entries(service.selector).map(([key, value]) => (
                  <Badge key={key} variant="outline" className="font-mono text-xs">
                    {key}={value}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    case 'endpoints':
      if (endpointsLoading) {
        return (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading endpoints...
          </div>
        );
      }
      if (!endpoints) {
        return <p className="text-sm text-muted-foreground">No endpoints found</p>;
      }
      return (
        <div className="space-y-4 text-sm">
          {endpoints.addresses.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Ready Addresses ({endpoints.addresses.length})</h4>
              <div className="space-y-1">
                {endpoints.addresses.map((addr, idx) => (
                  <div key={idx} className="text-xs bg-muted p-2 rounded flex items-center gap-2">
                    <span className="font-mono">{addr.ip}</span>
                    {addr.targetRef && (
                      <Badge variant="outline" className="text-xs">{addr.targetRef}</Badge>
                    )}
                    {addr.nodeName && (
                      <span className="text-muted-foreground">on {addr.nodeName}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {endpoints.notReadyAddresses && endpoints.notReadyAddresses.length > 0 && (
            <div>
              <h4 className="font-medium mb-2 text-yellow-500">Not Ready Addresses ({endpoints.notReadyAddresses.length})</h4>
              <div className="space-y-1">
                {endpoints.notReadyAddresses.map((addr, idx) => (
                  <div key={idx} className="text-xs bg-yellow-500/10 p-2 rounded flex items-center gap-2">
                    <span className="font-mono">{addr.ip}</span>
                    {addr.targetRef && (
                      <Badge variant="outline" className="text-xs">{addr.targetRef}</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {endpoints.ports.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Ports</h4>
              <div className="flex flex-wrap gap-1">
                {endpoints.ports.map((port, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs font-mono">
                    {port.name && `${port.name}: `}{port.port}/{port.protocol}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    default:
      return null;
  }
}

function renderConfigMapSection(sectionId: string, configMap: ConfigMap): React.ReactNode {
  switch (sectionId) {
    case 'data':
      return (
        <div className="space-y-4">
          {(!configMap.data || Object.keys(configMap.data).length === 0) &&
           (!configMap.binaryData || Object.keys(configMap.binaryData).length === 0) ? (
            <p className="text-sm text-muted-foreground">No data</p>
          ) : (
            <>
              {configMap.data && Object.entries(configMap.data).map(([key, value]) => (
                <div key={key} className="border rounded-md overflow-hidden">
                  <div className="bg-muted px-3 py-2 text-sm font-medium font-mono">
                    {key}
                  </div>
                  <pre className="p-3 text-xs overflow-x-auto max-h-40 overflow-y-auto bg-muted/30">
                    {value}
                  </pre>
                </div>
              ))}
              {configMap.binaryData && Object.entries(configMap.binaryData).map(([key, value]) => (
                <div key={key} className="border rounded-md overflow-hidden">
                  <div className="bg-muted px-3 py-2 text-sm font-medium font-mono flex items-center gap-2">
                    {key}
                    <Badge variant="secondary" className="text-xs">binary</Badge>
                  </div>
                  <div className="p-3 text-xs text-muted-foreground">
                    {value}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      );
    default:
      return null;
  }
}

// Helper functions
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'Ki', 'Mi', 'Gi', 'Ti'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatMillicores(millicores: number): string {
  if (millicores >= 1000) {
    return `${(millicores / 1000).toFixed(1)} cores`;
  }
  return `${millicores}m`;
}
