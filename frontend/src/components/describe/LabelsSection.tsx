import { memo, useState } from "react";
import { ChevronDown, ChevronRight, Copy, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface LabelsSectionProps {
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  showAnnotations?: boolean;
}

export const LabelsSection = memo(function LabelsSection({
  labels,
  annotations,
  showAnnotations = true
}: LabelsSectionProps) {
  const [showAllLabels, setShowAllLabels] = useState(false);
  const [showAllAnnotations, setShowAllAnnotations] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const labelEntries = Object.entries(labels || {});
  const annotationEntries = Object.entries(annotations || {}).filter(
    ([key]) => !key.startsWith('kubectl.kubernetes.io/')
  );

  const displayLabels = showAllLabels ? labelEntries : labelEntries.slice(0, 5);
  const displayAnnotations = showAllAnnotations ? annotationEntries : annotationEntries.slice(0, 3);

  const copyToClipboard = async (key: string, value: string) => {
    await navigator.clipboard.writeText(`${key}=${value}`);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Labels */}
      <div>
        <h4 className="text-sm font-medium mb-2">Labels ({labelEntries.length})</h4>
        {labelEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No labels</p>
        ) : (
          <div className="space-y-1">
            {displayLabels.map(([key, value]) => (
              <div
                key={key}
                className="flex items-center gap-2 group"
              >
                <Badge variant="outline" className="font-mono text-xs max-w-full">
                  <span className="truncate">{key}={value}</span>
                </Badge>
                <button
                  onClick={() => copyToClipboard(key, value)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Copy"
                >
                  {copiedKey === key ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3 text-muted-foreground" />
                  )}
                </button>
              </div>
            ))}
            {labelEntries.length > 5 && (
              <button
                onClick={() => setShowAllLabels(!showAllLabels)}
                className="text-xs text-primary flex items-center gap-1 hover:underline"
              >
                {showAllLabels ? (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronRight className="h-3 w-3" />
                    Show {labelEntries.length - 5} more
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Annotations */}
      {showAnnotations && (
        <div>
          <h4 className="text-sm font-medium mb-2">Annotations ({annotationEntries.length})</h4>
          {annotationEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No annotations</p>
          ) : (
            <div className="space-y-2">
              {displayAnnotations.map(([key, value]) => (
                <div key={key} className="text-xs border rounded p-2">
                  <div className="font-mono text-muted-foreground truncate" title={key}>
                    {key}
                  </div>
                  <div className="mt-1 break-all max-h-20 overflow-y-auto">
                    {value.length > 200 ? `${value.slice(0, 200)}...` : value}
                  </div>
                </div>
              ))}
              {annotationEntries.length > 3 && (
                <button
                  onClick={() => setShowAllAnnotations(!showAllAnnotations)}
                  className="text-xs text-primary flex items-center gap-1 hover:underline"
                >
                  {showAllAnnotations ? (
                    <>
                      <ChevronDown className="h-3 w-3" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronRight className="h-3 w-3" />
                      Show {annotationEntries.length - 3} more
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});
