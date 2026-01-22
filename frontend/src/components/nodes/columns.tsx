import type { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { Node } from "@/types/k8s"

const getStatusColor = (status: string) => {
  if (status === "Ready") return "bg-green-500"
  if (status === "NotReady") return "bg-red-500"
  return "bg-yellow-500"
}

const getStatusSortValue = (node: Node): number => {
  if (node.status === "Ready") return 0
  if (node.status === "NotReady") return 1
  return 2
}

export const nodeColumns: ColumnDef<Node>[] = [
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
    accessorKey: "roles",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2"
        >
          Roles
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const roles = row.original.roles
      return (
        <div>{roles.length > 0 ? roles.join(", ") : "-"}</div>
      )
    },
    sortingFn: (rowA, rowB) => {
      const rolesA = rowA.original.roles
      const rolesB = rowB.original.roles
      const hasControlA = rolesA.includes("control-plane") || rolesA.includes("master")
      const hasControlB = rolesB.includes("control-plane") || rolesB.includes("master")
      return hasControlA === hasControlB ? 0 : hasControlA ? -1 : 1
    },
  },
  {
    accessorKey: "status",
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
      const status = row.getValue("status") as string
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("h-3 w-3 rounded-full", getStatusColor(status))} />
          </TooltipTrigger>
          <TooltipContent><p>{status}</p></TooltipContent>
        </Tooltip>
      )
    },
    sortingFn: (rowA, rowB) => {
      return getStatusSortValue(rowA.original) - getStatusSortValue(rowB.original)
    },
  },
  {
    accessorKey: "cpuPercent",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2"
        >
          CPU %
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const cpu = row.getValue("cpuPercent") as number | undefined
      return <div>{cpu?.toFixed(1) ?? "-"}%</div>
    },
  },
  {
    accessorKey: "memoryPercent",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2"
        >
          Mem %
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const mem = row.getValue("memoryPercent") as number | undefined
      return <div>{mem?.toFixed(1) ?? "-"}%</div>
    },
  },
  {
    id: "podCount",
    accessorKey: "podCount",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2"
        >
          Pods
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const node = row.original
      return <div>{node.podCount}/{node.podCapacity ?? "-"}</div>
    },
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
