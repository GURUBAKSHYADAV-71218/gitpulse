export function PulseLine({ className = "", animate = true }: { className?: string; animate?: boolean }) {
  return (
    <svg
      viewBox="0 0 400 48"
      className={className}
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        d="M0 24 H120 L136 24 L148 6 L164 42 L178 24 L192 24 L204 14 L214 24 H400"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={240}
        className={animate ? "animate-pulse_line" : ""}
        strokeDasharray={animate ? "6 4" : undefined}
      />
    </svg>
  );
}
