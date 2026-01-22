import { TableCell, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn, getStatusColor } from "@/lib/utils";
import type { Pod } from "@/types/k8s";

interface PodRowProps {
  pod: Pod & { animationClass?: string };
  isSelected: boolean;
  onClick: () => void;
}

export function PodRow({ pod, isSelected, onClick }: PodRowProps) {
  return (
    <TableRow
      onClick={onClick}
      className={cn(
        "hover:bg-accent/50 cursor-pointer",
        isSelected && "bg-accent",
        pod.animationClass
      )}
    >
      <TableCell className="w-8">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("h-3 w-3 rounded-full", getStatusColor(pod.status))} />
          </TooltipTrigger>
          <TooltipContent><p>{pod.status}</p></TooltipContent>
        </Tooltip>
      </TableCell>
      <TableCell className="font-medium">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="truncate block max-w-[200px]">{pod.name}</span>
          </TooltipTrigger>
          <TooltipContent><p>{pod.name}</p></TooltipContent>
        </Tooltip>
      </TableCell>
      <TableCell className="text-muted-foreground">{pod.namespace}</TableCell>
      <TableCell>{pod.ready}</TableCell>
      <TableCell>{pod.restarts}</TableCell>
      <TableCell className="text-muted-foreground">{pod.age}</TableCell>
    </TableRow>
  );
}
