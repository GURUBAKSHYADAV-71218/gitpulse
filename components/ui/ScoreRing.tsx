function bandColor(score: number | null): string {
  if (score === null) return "#5B6472";
  if (score >= 90) return "#4DD8C0";
  if (score >= 75) return "#4DD8C0";
  if (score >= 55) return "#F0C94D";
  return "#F2506B";
}

export function ScoreRing({
  score,
  size = 168,
  strokeWidth = 10,
  label
}: {
  score: number | null;
  size?: number;
  strokeWidth?: number;
  label?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = score === null ? 0 : (score / 100) * circumference;
  const color = bandColor(score);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1C222C"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="font-mono text-4xl font-semibold tabular text-ink">
          {score === null ? "—" : score}
        </span>
        <span className="text-xs text-ink-faint">/ 100</span>
        {label && <span className="mt-1 text-xs text-ink-muted">{label}</span>}
      </div>
    </div>
  );
}
