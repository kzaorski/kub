import { TableCell, TableRow } from "@/components/ui/table";
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
        <div className={cn("h-3 w-3 rounded-full", getStatusColor())} />
      </TableCell>
      <TableCell className="font-medium">{deployment.name}</TableCell>
      <TableCell className="text-muted-foreground">{deployment.namespace}</TableCell>
      <TableCell>{deployment.readyReplicas}/{deployment.replicas}</TableCell>
      <TableCell>{deployment.strategy}</TableCell>
      <TableCell className="text-muted-foreground">{deployment.age}</TableCell>
    </TableRow>
  );
}
