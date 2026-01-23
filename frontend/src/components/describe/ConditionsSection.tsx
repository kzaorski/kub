import { memo } from "react";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PodCondition, NodeCondition, DeploymentCondition } from "@/types/k8s";

type Condition = PodCondition | NodeCondition | DeploymentCondition;

interface ConditionsSectionProps {
  conditions: Condition[];
}

export const ConditionsSection = memo(function ConditionsSection({ conditions }: ConditionsSectionProps) {
  if (!conditions || conditions.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-2">
        No conditions available
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {conditions.map((condition, idx) => {
        const isTrue = condition.status === "True";
        const lastTransition = 'lastTransitionTime' in condition ? condition.lastTransitionTime : null;

        return (
          <div
            key={`${condition.type}-${idx}`}
            className={cn(
              "p-2 rounded-md border text-sm flex items-start gap-2",
              isTrue ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"
            )}
          >
            {isTrue ? (
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{condition.type}</span>
                <span className={cn("text-xs", isTrue ? "text-green-600" : "text-red-600")}>
                  {condition.status}
                </span>
              </div>
              {condition.reason && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Reason: {condition.reason}
                </p>
              )}
              {condition.message && (
                <p className="text-xs text-muted-foreground mt-0.5 break-words">
                  {condition.message}
                </p>
              )}
              {lastTransition && (
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTime(lastTransition)}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});

function formatTime(isoString: string): string {
  if (!isoString) return "Unknown";
  const date = new Date(isoString);
  return date.toLocaleString();
}
