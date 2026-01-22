import { TableCell, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Service } from "@/types/k8s";

interface ServiceRowProps {
  service: Service & { animationClass?: string };
  isSelected: boolean;
  onClick: () => void;
}

export function ServiceRow({ service, isSelected, onClick }: ServiceRowProps) {
  const formatPorts = () => {
    return service.ports.map(p => `${p.port}/${p.protocol}`).join(", ");
  };

  return (
    <TableRow
      onClick={onClick}
      className={cn(
        "hover:bg-accent/50 cursor-pointer",
        isSelected && "bg-accent",
        service.animationClass
      )}
    >
      <TableCell className="w-8">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="h-3 w-3 rounded-full bg-blue-500" />
          </TooltipTrigger>
          <TooltipContent><p>Service</p></TooltipContent>
        </Tooltip>
      </TableCell>
      <TableCell className="font-medium">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="truncate block max-w-[200px]">{service.name}</span>
          </TooltipTrigger>
          <TooltipContent><p>{service.name}</p></TooltipContent>
        </Tooltip>
      </TableCell>
      <TableCell className="text-muted-foreground">{service.namespace}</TableCell>
      <TableCell>{service.type}</TableCell>
      <TableCell className="text-muted-foreground">{service.clusterIP || "-"}</TableCell>
      <TableCell className="text-muted-foreground">{formatPorts() || "-"}</TableCell>
      <TableCell className="text-muted-foreground">{service.age}</TableCell>
    </TableRow>
  );
}
