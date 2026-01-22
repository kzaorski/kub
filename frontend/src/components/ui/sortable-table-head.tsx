import { TableHead } from "./table";
import { cn } from "@/lib/utils";

interface SortableTableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  onSort: () => void;
  sortDirection: 'asc' | 'desc' | null;
  children: React.ReactNode;
}

export function SortableTableHead({
  onSort,
  sortDirection,
  children,
  className,
  ...props
}: SortableTableHeadProps) {
  return (
    <TableHead
      className={cn(
        "cursor-pointer select-none hover:bg-muted/50 transition-colors user-select-none",
        sortDirection && "font-semibold",
        className
      )}
      onClick={onSort}
      {...props}
    >
      <div className="flex items-center gap-1">
        {children}
        <span className="ml-1 text-muted-foreground text-xs min-w-[1em]">
          {sortDirection === 'asc' ? '↑' : sortDirection === 'desc' ? '↓' : '↕'}
        </span>
      </div>
    </TableHead>
  );
}
