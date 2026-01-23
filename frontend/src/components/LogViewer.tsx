import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Search, X, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLogStream } from '@/hooks/useLogStream';
import type { Pod } from '@/types/k8s';

interface LogViewerProps {
  pod: Pod;
  open: boolean;
  onClose: () => void;
}

const LINE_COUNT_OPTIONS = [
  { label: '100 lines', value: 100 },
  { label: '500 lines', value: 500 },
  { label: '1000 lines', value: 1000 },
  { label: 'All', value: 0 },
];

export function LogViewer({ pod, open, onClose }: LogViewerProps) {
  const [selectedContainer, setSelectedContainer] = useState('');
  const [lineCount, setLineCount] = useState(100);
  const [previous, setPrevious] = useState(false);
  const [timestamps, setTimestamps] = useState(false);
  const [follow, setFollow] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);

  const preRef = useRef<HTMLPreElement>(null);

  const {
    logs,
    containers,
    isLoading,
    error,
    isStreaming,
    fetchLogs,
    startStream,
    stopStream,
    downloadLogs,
  } = useLogStream(pod);

  // Set default container on mount
  useEffect(() => {
    if (containers.length > 0 && !selectedContainer) {
      setSelectedContainer(containers[0]);
    }
  }, [containers, selectedContainer]);

  // Auto-scroll to bottom when streaming
  useEffect(() => {
    if (autoScroll && preRef.current) {
      preRef.current.scrollTop = preRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Toggle follow mode
  useEffect(() => {
    if (follow && selectedContainer) {
      startStream({ container: selectedContainer, previous, timestamps });
    } else {
      stopStream();
    }
    return () => stopStream();
  }, [follow, selectedContainer, previous, timestamps]);

  const handleRefresh = useCallback(() => {
    if (selectedContainer) {
      stopStream();
      setFollow(false);
      fetchLogs({ container: selectedContainer, tailLines: lineCount, previous, timestamps });
    }
  }, [selectedContainer, lineCount, previous, timestamps, fetchLogs, stopStream]);

  const handleContainerChange = useCallback((value: string) => {
    setSelectedContainer(value);
    stopStream();
    setFollow(false);
  }, [stopStream]);

  const handleLineCountChange = useCallback((value: string) => {
    const count = value === 'all' ? 0 : parseInt(value, 10);
    setLineCount(count);
  }, []);

  const handleLoadLogs = useCallback(() => {
    if (selectedContainer) {
      stopStream();
      setFollow(false);
      fetchLogs({ container: selectedContainer, tailLines: lineCount, previous, timestamps });
    }
  }, [selectedContainer, lineCount, previous, timestamps, fetchLogs, stopStream]);

  const handleDownload = useCallback(() => {
    downloadLogs();
  }, [downloadLogs]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  // Filter logs by search query
  const filteredLogs = useCallback(() => {
    if (!searchQuery) return logs;
    const lines = logs.split('\n');
    const filtered = lines.filter(line =>
      line.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return filtered.join('\n');
  }, [logs, searchQuery])();

  const handleScroll = useCallback(() => {
    if (preRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = preRef.current;
      const isAtBottom = scrollHeight - scrollTop <= clientHeight + 50;
      setAutoScroll(isAtBottom);
    }
  }, []);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="flex w-full flex-col sm:max-w-4xl gap-4">
        <SheetHeader>
          <SheetTitle>Pod Logs</SheetTitle>
          <SheetDescription>
            {pod.namespace}/{pod.name}
          </SheetDescription>
        </SheetHeader>

        {/* Controls */}
        <div className="flex flex-col gap-4">
          {/* First row: Container and Line Count */}
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-muted-foreground mb-1 block">Container</label>
              <Select value={selectedContainer} onValueChange={handleContainerChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select container" />
                </SelectTrigger>
                <SelectContent>
                  {containers.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[140px]">
              <label className="text-xs text-muted-foreground mb-1 block">Lines</label>
              <Select value={lineCount.toString()} onValueChange={handleLineCountChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LINE_COUNT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value.toString()}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Second row: Toggles and Actions */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="previous"
                checked={previous}
                onCheckedChange={setPrevious}
                disabled={isStreaming}
              />
              <label htmlFor="previous" className="text-sm cursor-pointer">
                Previous
              </label>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="timestamps"
                checked={timestamps}
                onCheckedChange={setTimestamps}
                disabled={isStreaming}
              />
              <label htmlFor="timestamps" className="text-sm cursor-pointer">
                Timestamps
              </label>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="follow"
                checked={follow}
                onCheckedChange={(checked) => {
                  setFollow(checked);
                  if (checked && selectedContainer) {
                    startStream({ container: selectedContainer, previous, timestamps });
                  } else {
                    stopStream();
                  }
                }}
              />
              <label htmlFor="follow" className="text-sm cursor-pointer flex items-center gap-2">
                Follow
                {isStreaming && (
                  <Badge variant="secondary" className="text-xs">
                    Live
                  </Badge>
                )}
              </label>
            </div>

            <div className="flex-1" />

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isStreaming || isLoading}
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLoadLogs}
              disabled={isStreaming || isLoading || !selectedContainer}
            >
              Load
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={!logs}
              title="Download logs"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search in logs..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Error display */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Log display */}
        <div className="flex-1 min-h-0 border rounded-md bg-muted/50">
          <pre
            ref={preRef}
            onScroll={handleScroll}
            className="h-full overflow-auto p-4 text-xs font-mono whitespace-pre-wrap break-all"
          >
            {filteredLogs || (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <FileText className="h-8 w-8" />
                  <p>
                    {!selectedContainer
                      ? 'Select a container to view logs'
                      : 'Click "Load" to fetch logs or enable "Follow" for live streaming'}
                  </p>
                </div>
              </div>
            )}
          </pre>
        </div>

        {/* Status bar */}
        {logs && (
          <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
            <span>
              {filteredLogs.split('\n').length} lines
              {searchQuery && ` (filtered from ${logs.split('\n').length} total)`}
            </span>
            {autoScroll && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Auto-scroll
              </span>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
