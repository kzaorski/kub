import type { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { Deployment } from "@/types/k8s"

const getStatusColor = (deployment: Deployment): string => {
  const isReady = deployment.readyReplicas === deployment.replicas && deployment.replicas > 0
  const isProgressing = deployment.readyReplicas < deployment.replicas && deployment.readyReplicas > 0

  if (isReady) return "bg-green-500"
  if (isProgressing) return "bg-yellow-500"
  return "bg-gray-400"
}

export const deploymentColumns: ColumnDef<Deployment>[] = [
  {
    id: "expander",
    header: () => <div className="w-8"></div>,
    cell: () => <div className="w-8"></div>,
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2"
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="truncate block max-w-[200px] font-medium">
              {row.getValue("name")}
            </span>
          </TooltipTrigger>
          <TooltipContent><p>{row.getValue("name")}</p></TooltipContent>
        </Tooltip>
      )
    },
  },
  {
    accessorKey: "namespace",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2"
        >
          Namespace
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => (
      <div className="text-muted-foreground">{row.getValue("namespace")}</div>
    ),
  },
  {
    id: "status",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2"
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const deployment = row.original
      const isReady = deployment.readyReplicas === deployment.replicas && deployment.replicas > 0
      const isProgressing = deployment.readyReplicas < deployment.replicas && deployment.readyReplicas > 0

      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("h-3 w-3 rounded-full", getStatusColor(deployment))} />
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {isReady ? "Ready" : isProgressing ? "Progressing" : "Not Ready"}
              {deployment.replicas > 0 && ` (${deployment.readyReplicas}/${deployment.replicas})`}
            </p>
          </TooltipContent>
        </Tooltip>
      )
    },
    sortingFn: (rowA, rowB) => {
      const a = rowA.original
      const b = rowB.original
      const ratioA = a.replicas > 0 ? a.readyReplicas / a.replicas : -1
      const ratioB = b.replicas > 0 ? b.readyReplicas / b.replicas : -1
      return ratioA - ratioB
    },
  },
  {
    id: "ready",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2"
        >
          Ready
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const deployment = row.original
      return <div>{deployment.readyReplicas}/{deployment.replicas}</div>
    },
  },
  {
    accessorKey: "strategy",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2"
        >
          Strategy
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => <div>{row.getValue("strategy")}</div>,
  },
  {
    accessorKey: "age",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2"
        >
          Age
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => (
      <div className="text-muted-foreground">{row.getValue("age")}</div>
    ),
  },
]
