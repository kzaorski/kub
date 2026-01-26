import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle } from "lucide-react";

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

  // Check if no constraints are defined
  const hasNoConstraints = request === 0 && limit === 0;

  // Color based on usage
  const getBarColor = () => {
    if (hasNoConstraints) return "bg-gray-400";
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
      <div
        className={cn(
          "relative h-2 rounded-full overflow-hidden flex-1 max-w-32",
          hasNoConstraints
            ? "bg-muted/50 border border-dashed border-muted-foreground/20"
            : "bg-muted"
        )}
      >
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
      <div className="flex gap-2 text-muted-foreground items-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn(request === 0 && "text-muted-foreground/50")} tabIndex={0}>
              {request > 0 ? `${percentOfRequest.toFixed(0)}%` : "-"}/R
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {request > 0
                ? `Using ${percentOfRequest.toFixed(1)}% of requested ${formatFn(request)}`
                : `No ${label.toLowerCase()} request defined`
              }
            </p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn(limit === 0 && "text-muted-foreground/50")} tabIndex={0}>
              {limit > 0 ? `${percentOfLimit.toFixed(0)}%` : "-"}/L
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {limit > 0
                ? `Using ${percentOfLimit.toFixed(1)}% of limit ${formatFn(limit)}`
                : `No ${label.toLowerCase()} limit - unbounded usage allowed`
              }
            </p>
          </TooltipContent>
        </Tooltip>
        <span className="text-muted-foreground/60">({request > 0 ? formatFn(request) : "-"}/{limit > 0 ? formatFn(limit) : "-"})</span>
        {hasNoConstraints && (
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertTriangle
                className="h-3 w-3 text-amber-500"
                tabIndex={0}
                aria-label="Warning: no resource constraints defined"
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>No resource constraints defined. Pod can consume unbounded {label.toLowerCase()}.</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
