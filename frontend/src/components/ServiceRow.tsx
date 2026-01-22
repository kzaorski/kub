import { TableCell, TableRow } from "@/components/ui/table";
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
        <div className="h-3 w-3 rounded-full bg-blue-500" />
      </TableCell>
      <TableCell className="font-medium">{service.name}</TableCell>
      <TableCell className="text-muted-foreground">{service.namespace}</TableCell>
      <TableCell>{service.type}</TableCell>
      <TableCell className="text-muted-foreground">{service.clusterIP || "-"}</TableCell>
      <TableCell className="text-muted-foreground">{formatPorts() || "-"}</TableCell>
      <TableCell className="text-muted-foreground">{service.age}</TableCell>
    </TableRow>
  );
}
