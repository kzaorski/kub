import { cn } from "@/lib/utils";

interface GaugeChartProps {
  value: number;
  max?: number;
  label: string;
  sublabel?: string;
  size?: "sm" | "md" | "lg";
  colorThresholds?: {
    warning: number;
    danger: number;
  };
}

export function GaugeChart({
  value,
  max = 100,
  label,
  sublabel,
  size = "md",
  colorThresholds = { warning: 60, danger: 80 },
}: GaugeChartProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    if (percentage >= colorThresholds.danger) return "stroke-red-500";
    if (percentage >= colorThresholds.warning) return "stroke-yellow-500";
    return "stroke-green-500";
  };

  const sizes = {
    sm: { width: 80, height: 80, textSize: "text-sm", sublabelSize: "text-xs" },
    md: { width: 120, height: 120, textSize: "text-lg", sublabelSize: "text-sm" },
    lg: { width: 160, height: 160, textSize: "text-2xl", sublabelSize: "text-base" },
  };

  const { width, height, textSize, sublabelSize } = sizes[size];

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width, height }}>
        <svg
          className="transform -rotate-90"
          width={width}
          height={height}
          viewBox="0 0 100 100"
        >
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="currentColor"
            className="text-muted stroke-[8]"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            className={cn("stroke-[8] transition-all duration-500", getColor())}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("font-bold", textSize)}>
            {percentage.toFixed(0)}%
          </span>
          {sublabel && (
            <span className={cn("text-muted-foreground", sublabelSize)}>
              {sublabel}
            </span>
          )}
        </div>
      </div>
      <span className="mt-2 text-sm font-medium text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
