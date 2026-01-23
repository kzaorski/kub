import { memo } from "react";
import { HardDrive, FileText, Lock, Database } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Volume } from "@/types/k8s";

interface VolumeSectionProps {
  volumes: Volume[];
}

export const VolumeSection = memo(function VolumeSection({ volumes }: VolumeSectionProps) {
  if (!volumes || volumes.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-2">
        No volumes
      </div>
    );
  }

  const getVolumeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'configmap':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'secret':
        return <Lock className="h-4 w-4 text-yellow-500" />;
      case 'pvc':
        return <Database className="h-4 w-4 text-purple-500" />;
      default:
        return <HardDrive className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTypeVariant = (type: string): "default" | "secondary" | "outline" => {
    switch (type.toLowerCase()) {
      case 'configmap':
        return "default";
      case 'secret':
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-2">
      {volumes.map((volume, idx) => (
        <div
          key={`${volume.name}-${idx}`}
          className="p-2 rounded-md border text-sm flex items-start gap-2"
        >
          {getVolumeIcon(volume.type)}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{volume.name}</span>
              <Badge variant={getTypeVariant(volume.type)} className="text-xs">
                {volume.type}
              </Badge>
            </div>
            {volume.source && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate" title={volume.source}>
                Source: {volume.source}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
});
