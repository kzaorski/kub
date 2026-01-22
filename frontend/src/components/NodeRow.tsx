import { TableCell, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Node } from "@/types/k8s";

interface NodeRowProps {
  node: Node;
  isSelected: boolean;
  onClick: () => void;
}

export function NodeRow({ node, isSelected, onClick }: NodeRowProps) {
  const getStatusColor = (status: string) => {
    if (status === "Ready") return "bg-green-500";
    if (status === "NotReady") return "bg-red-500";
    return "bg-yellow-500";
  };

  return (
    <TableRow
      onClick={onClick}
      className={cn(
        "hover:bg-accent/50 cursor-pointer",
        isSelected && "bg-accent"
      )}
    >
      <TableCell className="w-8">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("h-3 w-3 rounded-full", getStatusColor(node.status))} />
          </TooltipTrigger>
          <TooltipContent><p>{node.status}</p></TooltipContent>
        </Tooltip>
      </TableCell>
      <TableCell className="font-medium">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="truncate block max-w-[200px]">{node.name}</span>
          </TooltipTrigger>
          <TooltipContent><p>{node.name}</p></TooltipContent>
        </Tooltip>
      </TableCell>
      <TableCell>
        {node.roles.length > 0 ? node.roles.join(", ") : "-"}
      </TableCell>
      <TableCell>{node.status}</TableCell>
      <TableCell>{node.cpuPercent?.toFixed(1) ?? "-"}%</TableCell>
      <TableCell>{node.memoryPercent?.toFixed(1) ?? "-"}%</TableCell>
      <TableCell>{node.podCount}/{node.podCapacity ?? "-"}</TableCell>
      <TableCell className="text-muted-foreground">{node.age}</TableCell>
    </TableRow>
  );
}
