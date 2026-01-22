import { TableCell, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Deployment } from "@/types/k8s";

interface DeploymentRowProps {
  deployment: Deployment & { animationClass?: string };
  isSelected: boolean;
  onClick: () => void;
}

export function DeploymentRow({ deployment, isSelected, onClick }: DeploymentRowProps) {
  const isReady = deployment.readyReplicas === deployment.replicas && deployment.replicas > 0;
  const isProgressing = deployment.readyReplicas < deployment.replicas && deployment.readyReplicas > 0;

  const getStatusColor = () => {
    if (isReady) return "bg-green-500";
    if (isProgressing) return "bg-yellow-500";
    return "bg-gray-400";
  };

  return (
    <TableRow
      onClick={onClick}
      className={cn(
        "hover:bg-accent/50 cursor-pointer",
        isSelected && "bg-accent",
        deployment.animationClass
      )}
    >
      <TableCell className="w-8">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("h-3 w-3 rounded-full", getStatusColor())} />
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {isReady ? "Ready" : isProgressing ? "Progressing" : "Not Ready"}
              {deployment.replicas > 0 && ` (${deployment.readyReplicas}/${deployment.replicas})`}
            </p>
          </TooltipContent>
        </Tooltip>
      </TableCell>
      <TableCell className="font-medium">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="truncate block max-w-[200px]">{deployment.name}</span>
          </TooltipTrigger>
          <TooltipContent><p>{deployment.name}</p></TooltipContent>
        </Tooltip>
      </TableCell>
      <TableCell className="text-muted-foreground">{deployment.namespace}</TableCell>
      <TableCell>{deployment.readyReplicas}/{deployment.replicas}</TableCell>
      <TableCell>{deployment.strategy}</TableCell>
      <TableCell className="text-muted-foreground">{deployment.age}</TableCell>
    </TableRow>
  );
}
