import { cn } from "@/lib/utils";

interface ResourceBarProps {
  label: string;
  icon?: React.ReactNode;
  usage: number;
  request: number;
  limit: number;
  formatFn: (value: number) => string;
}

export function ResourceBar({ label, icon, usage, request, limit, formatFn }: ResourceBarProps) {
  // Calculate max as the largest value (for scale)
  const max = Math.max(usage, request, limit) || 1;

  // Calculate percentages
  const usagePercent = (usage / max) * 100;
  const requestPercent = (request / max) * 100;

  // Calculate %R and %L
  const percentOfRequest = request > 0 ? (usage / request) * 100 : 0;
  const percentOfLimit = limit > 0 ? (usage / limit) * 100 : 0;

  // Color based on usage
  const getBarColor = () => {
    if (limit > 0 && usage >= limit) return "bg-red-500";
    if (request > 0 && usage >= request) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="flex items-center gap-3 text-xs">
      {/* Label */}
      <div className="flex items-center gap-1 text-muted-foreground min-w-20">
        {icon}
        <span>{label}: {formatFn(usage)}</span>
      </div>

      {/* Layered bar */}
      <div className="relative h-2 bg-muted rounded-full overflow-hidden flex-1 max-w-32">
        {/* Usage layer */}
        <div
          className={cn("absolute h-full rounded-full transition-all", getBarColor())}
          style={{ width: `${usagePercent}%` }}
        />
        {/* Request marker */}
        {request > 0 && (
          <div
            className="absolute h-full w-0.5 bg-blue-500"
            style={{ left: `${requestPercent}%` }}
          />
        )}
        {/* Limit marker (only if limit < max, meaning usage exceeded limit) */}
        {limit > 0 && limit < max && (
          <div
            className="absolute h-full w-0.5 bg-red-500"
            style={{ left: `${(limit / max) * 100}%` }}
          />
        )}
      </div>

      {/* Percentages and R/L values */}
      <div className="flex gap-2 text-muted-foreground">
        <span>{request > 0 ? `${percentOfRequest.toFixed(0)}%` : "-"}/R</span>
        <span>{limit > 0 ? `${percentOfLimit.toFixed(0)}%` : "-"}/L</span>
        <span className="text-muted-foreground/60">({request > 0 ? formatFn(request) : "-"}/{limit > 0 ? formatFn(limit) : "-"})</span>
      </div>
    </div>
  );
}
