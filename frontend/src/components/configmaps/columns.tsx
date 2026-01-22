import type { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { ConfigMap } from "@/types/k8s"

export const configmapColumns: ColumnDef<ConfigMap>[] = [
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
    accessorKey: "dataCount",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2"
        >
          Keys
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const configmap = row.original
      return <div>{configmap.dataCount} {configmap.dataCount === 1 ? 'key' : 'keys'}</div>
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
