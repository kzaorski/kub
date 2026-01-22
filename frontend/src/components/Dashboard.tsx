import { useState } from "react";
import {
  Server,
  Box,
  Activity,
  AlertCircle,
  CheckCircle2,
  Layers,
  Network,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PodList } from "./PodList";
import { NodeList } from "./NodeList";
import { DeploymentList } from "./DeploymentList";
import { ServiceList } from "./ServiceList";
import { ConfigMapList } from "./ConfigMapList";
import { GaugeChart } from "./GaugeChart";
import { ContextSelector } from "./ContextSelector";
import { usePods } from "@/hooks/usePods";
import { useNodes } from "@/hooks/useNodes";
import { useDeployments } from "@/hooks/useDeployments";
import { useServices } from "@/hooks/useServices";
import { useConfigMaps } from "@/hooks/useConfigMaps";
import { formatBytes, formatMillicores } from "@/lib/utils";

export function Dashboard() {
  const [namespace, setNamespace] = useState("all");
  const [contextVersion, setContextVersion] = useState(0);
  const { pods, summary, isLoading, error, isConnected } =
    usePods(namespace, contextVersion);
  const { nodes, isLoading: nodesLoading } = useNodes(contextVersion);
  const { deployments, isLoading: deploymentsLoading } = useDeployments(namespace, contextVersion);
  const { services, isLoading: servicesLoading } = useServices(namespace, contextVersion);
  const { configmaps, isLoading: configmapsLoading } = useConfigMaps(namespace, contextVersion);

  const handleContextChange = () => {
    setContextVersion((v) => v + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Box className="h-6 w-6 text-primary" />
              KUB
            </h1>
            <Badge
              variant={isConnected ? "success" : "error"}
              className="flex items-center gap-1"
            >
              {isConnected ? (
                <>
                  <CheckCircle2 className="h-3 w-3" />
                  Connected
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3" />
                  Disconnected
                </>
              )}
            </Badge>
          </div>
          <ContextSelector
            selectedNamespace={namespace}
            onNamespaceChange={setNamespace}
            onContextChange={handleContextChange}
          />
        </div>
      </header>

      <main className="container px-4 py-6">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Cluster Utilization */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Cluster Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-4">
              <GaugeChart
                value={summary?.cpuPercent ?? 0}
                label="CPU"
                sublabel={summary ? formatMillicores(summary.usedCpu) : "-"}
                size="lg"
              />
              <GaugeChart
                value={summary?.memoryPercent ?? 0}
                label="Memory"
                sublabel={summary ? formatBytes(summary.usedMemory) : "-"}
                size="lg"
              />
              <div className="flex flex-col justify-center">
                <div className="text-sm text-muted-foreground mb-1">CPU Usage</div>
                <div className="text-2xl font-bold">
                  {summary?.cpuPercent?.toFixed(1) ?? "-"}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {summary
                    ? `${formatMillicores(summary.usedCpu)} / ${formatMillicores(summary.totalCpu)}`
                    : "-"}
                </p>
              </div>
              <div className="flex flex-col justify-center">
                <div className="text-sm text-muted-foreground mb-1">Memory Usage</div>
                <div className="text-2xl font-bold">
                  {summary?.memoryPercent?.toFixed(1) ?? "-"}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {summary
                    ? `${formatBytes(summary.usedMemory)} / ${formatBytes(summary.totalMemory)}`
                    : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resource Tabs */}
        <Tabs defaultValue="nodes" className="mb-6">
          <TabsList>
            <TabsTrigger value="nodes">
              <Server className="h-4 w-4 mr-2" />
              Nodes ({summary?.readyNodes ?? "-"}/{summary?.totalNodes ?? "-"})
            </TabsTrigger>
            <TabsTrigger value="pods">
              <Box className="h-4 w-4 mr-2" />
              Pods ({summary?.runningPods ?? "-"}/{summary?.totalPods ?? "-"})
            </TabsTrigger>
            <TabsTrigger value="deployments">
              <Layers className="h-4 w-4 mr-2" />
              Deployments ({deployments.length})
            </TabsTrigger>
            <TabsTrigger value="services">
              <Network className="h-4 w-4 mr-2" />
              Services ({services.length})
            </TabsTrigger>
            <TabsTrigger value="configmaps">
              <FileText className="h-4 w-4 mr-2" />
              ConfigMaps ({configmaps.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="nodes">
            <NodeList nodes={nodes} isLoading={nodesLoading} />
          </TabsContent>
          <TabsContent value="pods">
            <PodList pods={pods} isLoading={isLoading} />
          </TabsContent>
          <TabsContent value="deployments">
            <DeploymentList deployments={deployments} isLoading={deploymentsLoading} />
          </TabsContent>
          <TabsContent value="services">
            <ServiceList services={services} isLoading={servicesLoading} />
          </TabsContent>
          <TabsContent value="configmaps">
            <ConfigMapList configmaps={configmaps} isLoading={configmapsLoading} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
