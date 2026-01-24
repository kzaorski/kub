import { memo, useState, useEffect, useCallback, useRef } from "react";
import { Bell, AlertTriangle, CheckCircle2, Clock, X, RefreshCw, ExternalLink, Box } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, parseEventFieldPath } from "@/lib/utils";
import { getApiUrl } from "@/lib/api";
import type { Event, DescribableResource } from "@/types/k8s";

interface EventsPopoverProps {
  resourceType: DescribableResource;
  resourceName: string;
  namespace: string;
  onViewAll?: () => void;
}

export const EventsPopover = memo(function EventsPopover({
  resourceType,
  resourceName,
  namespace,
  onViewAll
}: EventsPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const warningCount = events.filter(e => e.type === 'Warning').length;

  const fetchEvents = useCallback(async () => {
    const eventNs = resourceType === 'Node' ? 'default' : namespace;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        getApiUrl(`/api/events/${eventNs}/${resourceType}/${resourceName}`)
      );
      if (response.ok) {
        const data = await response.json();
        setEvents(data || []);
      } else {
        setError('Failed to fetch events');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [resourceType, resourceName, namespace]);

  // Fetch events when popover opens
  useEffect(() => {
    if (isOpen) {
      fetchEvents();
      // Auto-refresh every 5 seconds
      intervalRef.current = setInterval(fetchEvents, 5000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isOpen, fetchEvents]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={popoverRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-6 w-6 rounded-md hover:bg-accent flex items-center justify-center transition-colors relative",
          isOpen && "bg-accent"
        )}
        title={`Events${warningCount > 0 ? ` (${warningCount} warning${warningCount > 1 ? 's' : ''})` : ''}`}
      >
        <Bell className={cn("h-4 w-4", warningCount > 0 ? "text-yellow-500" : "text-muted-foreground")} />
        {warningCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-yellow-500 text-white text-[10px] rounded-full flex items-center justify-center font-medium">
            {warningCount > 9 ? '9+' : warningCount}
          </span>
        )}
      </button>

      {/* Popover Content */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[420px] bg-popover border rounded-lg shadow-lg z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="font-medium text-sm">Events</span>
              <Badge variant="secondary" className="text-xs">
                {events.length}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={fetchEvents}
                className="p-1 hover:bg-accent rounded transition-colors"
                title="Refresh"
                disabled={loading}
              >
                <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-accent rounded transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-80 overflow-y-auto p-2">
            {loading && events.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-4">
                Loading events...
              </div>
            ) : error ? (
              <div className="text-center text-sm text-red-500 py-4">
                {error}
              </div>
            ) : events.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-4">
                No events found
              </div>
            ) : (
              <div className="space-y-2">
                {events.slice(0, 5).map((event, idx) => (
                  <div
                    key={`${event.reason}-${event.lastSeen}-${idx}`}
                    className={cn(
                      "p-2 rounded-md border text-xs",
                      event.type === "Warning" ? "border-yellow-500/50 bg-yellow-500/5" : "border-border"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {event.type === "Warning" ? (
                        <AlertTriangle className="h-3 w-3 text-yellow-500 mt-0.5 shrink-0" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 flex-wrap">
                          <Badge
                            variant={event.type === "Warning" ? "warning" : "secondary"}
                            className="text-[10px] px-1 py-0"
                          >
                            {event.reason}
                          </Badge>
                          {event.fieldPath && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 flex items-center gap-0.5">
                              <Box className="h-2.5 w-2.5" />
                              {parseEventFieldPath(event.fieldPath)}
                            </Badge>
                          )}
                          <span className="text-muted-foreground flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {formatEventTime(event.lastSeen)}
                          </span>
                        </div>
                        <p className="text-muted-foreground mt-1 break-words">
                          {event.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t flex items-center justify-between text-xs text-muted-foreground">
            <span>Auto-refresh: 5s</span>
            {onViewAll && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onViewAll();
                }}
                className="flex items-center gap-1 text-primary hover:underline"
              >
                View All
                <ExternalLink className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
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

  if (diffSec < 60) return `${diffSec}s`;
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHour < 24) return `${diffHour}h`;
  return `${diffDay}d`;
}
