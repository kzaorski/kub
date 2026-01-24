import { memo } from "react";
import { AlertTriangle, CheckCircle2, Clock, Box } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, parseEventFieldPath } from "@/lib/utils";
import type { Event } from "@/types/k8s";

interface EventsSectionProps {
  events: Event[];
  maxItems?: number;
}

export const EventsSection = memo(function EventsSection({ events, maxItems }: EventsSectionProps) {
  const displayEvents = maxItems ? events.slice(0, maxItems) : events;

  if (displayEvents.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-2">
        No events found
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {displayEvents.map((event, idx) => (
        <div
          key={`${event.reason}-${event.lastSeen}-${idx}`}
          className={cn(
            "p-2 rounded-md border text-sm",
            event.type === "Warning" ? "border-yellow-500/50 bg-yellow-500/5" : "border-border"
          )}
        >
          <div className="flex items-start gap-2">
            {event.type === "Warning" ? (
              <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={event.type === "Warning" ? "warning" : "secondary"} className="text-xs">
                  {event.reason}
                </Badge>
                {event.fieldPath && (
                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                    <Box className="h-3 w-3" />
                    {parseEventFieldPath(event.fieldPath)}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatEventTime(event.lastSeen)}
                </span>
                {event.count > 1 && (
                  <span className="text-xs text-muted-foreground">
                    ({event.count}x)
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 break-words">
                {event.message}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 opacity-70">
                Source: {event.source}
              </p>
            </div>
          </div>
        </div>
      ))}
      {maxItems && events.length > maxItems && (
        <p className="text-xs text-muted-foreground text-center">
          +{events.length - maxItems} more events
        </p>
      )}
    </div>
  );
});

function formatEventTime(isoString: string): string {
  if (!isoString) return "Unknown";
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return `${diffDay}d ago`;
}
