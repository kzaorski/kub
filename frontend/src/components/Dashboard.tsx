import { useState } from "react";
import {
  Server,
  Box,
  Cpu,
  MemoryStick,
  Activity,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PodList } from "./PodList";
import { GaugeChart } from "./GaugeChart";
import { ContextSelector } from "./ContextSelector";
import { usePods } from "@/hooks/usePods";
import { formatBytes, formatMillicores } from "@/lib/utils";

export function Dashboard() {
  const [namespace, setNamespace] = useState("all");
  const [contextVersion, setContextVersion] = useState(0);
  const { pods, summary, isLoading, error, isConnected } =
    usePods(namespace, contextVersion);

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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Nodes</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary?.readyNodes ?? "-"}/{summary?.totalNodes ?? "-"}
              </div>
              <p className="text-xs text-muted-foreground">Ready nodes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pods</CardTitle>
              <Box className="h-4 w-4 text-muted-foreground" />
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

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary?.cpuPercent?.toFixed(1) ?? "-"}%
              </div>
              <p className="text-xs text-muted-foreground">
                {summary
                  ? `${formatMillicores(summary.usedCpu)} / ${formatMillicores(summary.totalCpu)}`
                  : "-"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Memory Usage
              </CardTitle>
              <MemoryStick className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary?.memoryPercent?.toFixed(1) ?? "-"}%
              </div>
              <p className="text-xs text-muted-foreground">
                {summary
                  ? `${formatBytes(summary.usedMemory)} / ${formatBytes(summary.totalMemory)}`
                  : "-"}
              </p>
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
            <div className="flex justify-around max-w-md">
              <GaugeChart
                value={summary?.cpuPercent ?? 0}
                label="CPU"
                sublabel={summary ? formatMillicores(summary.usedCpu) : "-"}
                size="md"
              />
              <GaugeChart
                value={summary?.memoryPercent ?? 0}
                label="Memory"
                sublabel={summary ? formatBytes(summary.usedMemory) : "-"}
                size="md"
              />
            </div>
          </CardContent>
        </Card>

        {/* Pods Section */}
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
      </main>
    </div>
  );
}
