import { TableCell, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ConfigMap } from "@/types/k8s";

interface ConfigMapRowProps {
  configmap: ConfigMap & { animationClass?: string };
  isSelected: boolean;
  onClick: () => void;
}

export function ConfigMapRow({ configmap, isSelected, onClick }: ConfigMapRowProps) {
  return (
    <TableRow
      onClick={onClick}
      className={cn(
        "hover:bg-accent/50 cursor-pointer",
        isSelected && "bg-accent",
        configmap.animationClass
      )}
    >
      <TableCell className="w-8">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="h-3 w-3 rounded-full bg-purple-500" />
          </TooltipTrigger>
          <TooltipContent><p>ConfigMap</p></TooltipContent>
        </Tooltip>
      </TableCell>
      <TableCell className="font-medium">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="truncate block max-w-[200px]">{configmap.name}</span>
          </TooltipTrigger>
          <TooltipContent><p>{configmap.name}</p></TooltipContent>
        </Tooltip>
      </TableCell>
      <TableCell className="text-muted-foreground">{configmap.namespace}</TableCell>
      <TableCell>{configmap.dataCount} {configmap.dataCount === 1 ? 'key' : 'keys'}</TableCell>
      <TableCell className="text-muted-foreground">{configmap.age}</TableCell>
    </TableRow>
  );
}
