import type { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn, getStatusColor } from "@/lib/utils"
import type { Pod } from "@/types/k8s"

// Status priority for sorting
const statusPriority: Record<string, number> = {
  'Failed': 0,
  'Error': 1,
  'CrashLoopBackOff': 2,
  'Pending': 3,
  'Running': 4,
  'Succeeded': 5,
}

const getStatusSortValue = (status: string): number => {
  return statusPriority[status] ?? 999
}

export const podColumns: ColumnDef<Pod>[] = [
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
      const statusA = rowA.getValue("status") as string
      const statusB = rowB.getValue("status") as string
      return getStatusSortValue(statusA) - getStatusSortValue(statusB)
    },
  },
  {
    accessorKey: "ready",
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
    cell: ({ row }) => <div>{row.getValue("ready")}</div>,
  },
  {
    accessorKey: "restarts",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2"
        >
          Restarts
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => <div>{row.getValue("restarts")}</div>,
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
