import { useState } from "react";
import {
  Server,
  Box,
  Cpu,
  MemoryStick,
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Layers,
  Network,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

type OpenSection = "nodes" | "pods" | "deployments" | "services" | "configmaps" | null;

export function Dashboard() {
  const [namespace, setNamespace] = useState("all");
  const [contextVersion, setContextVersion] = useState(0);
  const [openSection, setOpenSection] = useState<OpenSection>(null);
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
          <div className="mb-6 p-4 border border-red-200 bg-red-50 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card
            className="cursor-pointer transition-colors hover:bg-accent/50"
            onClick={() => setOpenSection(openSection === "nodes" ? null : "nodes")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Nodes</CardTitle>
              <div className="flex items-center gap-1">
                <Server className="h-4 w-4 text-muted-foreground" />
                {openSection === "nodes" ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary?.readyNodes ?? "-"}/{summary?.totalNodes ?? "-"}
              </div>
              <p className="text-xs text-muted-foreground">Ready nodes</p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-colors hover:bg-accent/50"
            onClick={() => setOpenSection(openSection === "pods" ? null : "pods")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pods</CardTitle>
              <div className="flex items-center gap-1">
                <Box className="h-4 w-4 text-muted-foreground" />
                {openSection === "pods" ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary?.runningPods ?? "-"}/{summary?.totalPods ?? "-"}
              </div>
              <p className="text-xs text-muted-foreground">
                Running pods
                {summary && summary.pendingPods > 0 && (
                  <span className="text-yellow-600">
                    {" "}
                    ({summary.pendingPods} pending)
                  </span>
                )}
                {summary && summary.failedPods > 0 && (
                  <span className="text-red-600">
                    {" "}
                    ({summary.failedPods} failed)
                  </span>
                )}
              </p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-colors hover:bg-accent/50"
            onClick={() => setOpenSection(openSection === "deployments" ? null : "deployments")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Deployments</CardTitle>
              <div className="flex items-center gap-1">
                <Layers className="h-4 w-4 text-muted-foreground" />
                {openSection === "deployments" ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{deployments.length}</div>
              <p className="text-xs text-muted-foreground">
                {deployments.filter(d => d.readyReplicas === d.replicas && d.replicas > 0).length} ready
              </p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-colors hover:bg-accent/50"
            onClick={() => setOpenSection(openSection === "services" ? null : "services")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Services</CardTitle>
              <div className="flex items-center gap-1">
                <Network className="h-4 w-4 text-muted-foreground" />
                {openSection === "services" ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{services.length}</div>
              <p className="text-xs text-muted-foreground">Total services</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card
            className="cursor-pointer transition-colors hover:bg-accent/50"
            onClick={() => setOpenSection(openSection === "configmaps" ? null : "configmaps")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ConfigMaps</CardTitle>
              <div className="flex items-center gap-1">
                <FileText className="h-4 w-4 text-muted-foreground" />
                {openSection === "configmaps" ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{configmaps.length}</div>
              <p className="text-xs text-muted-foreground">Total configmaps</p>
            </CardContent>
          </Card>
        </div>

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

        {/* Nodes Section */}
        {openSection === "nodes" && (
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Server className="h-5 w-5" />
                Nodes
                <Badge variant="secondary" className="ml-2">
                  {nodes.length}
                </Badge>
              </h2>
            </div>
            <NodeList nodes={nodes} isLoading={nodesLoading} />
          </div>
        )}

        {/* Pods Section */}
        {openSection === "pods" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Box className="h-5 w-5" />
                Pods
                <Badge variant="secondary" className="ml-2">
                  {pods.length}
                </Badge>
              </h2>
            </div>
            <PodList pods={pods} isLoading={isLoading} />
          </div>
        )}

        {/* Deployments Section */}
        {openSection === "deployments" && (
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Deployments
                <Badge variant="secondary" className="ml-2">
                  {deployments.length}
                </Badge>
              </h2>
            </div>
            <DeploymentList deployments={deployments} isLoading={deploymentsLoading} />
          </div>
        )}

        {/* Services Section */}
        {openSection === "services" && (
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Network className="h-5 w-5" />
                Services
                <Badge variant="secondary" className="ml-2">
                  {services.length}
                </Badge>
              </h2>
            </div>
            <ServiceList services={services} isLoading={servicesLoading} />
          </div>
        )}

        {/* ConfigMaps Section */}
        {openSection === "configmaps" && (
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5" />
                ConfigMaps
                <Badge variant="secondary" className="ml-2">
                  {configmaps.length}
                </Badge>
              </h2>
            </div>
            <ConfigMapList configmaps={configmaps} isLoading={configmapsLoading} />
          </div>
        )}
      </main>
    </div>
  );
}
