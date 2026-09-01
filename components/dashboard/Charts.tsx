"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CategoryScore, ContributorRecord, Severity } from "@/lib/types";

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: "#F2506B",
  high: "#F5934D",
  medium: "#F0C94D",
  low: "#4DD8C0",
  unknown: "#5B6472"
};

function scoreColor(score: number | null): string {
  if (score === null) return "#5B6472";
  if (score >= 75) return "#4DD8C0";
  if (score >= 55) return "#F0C94D";
  return "#F2506B";
}

export function CategoryScoreChart({ categories }: { categories: CategoryScore[] }) {
  const data = categories
    .filter((c) => c.weight > 0)
    .map((c) => ({ name: c.label.replace(" Health", "").replace(" Activity", ""), score: c.score ?? 0, available: c.score !== null }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1C222C" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={{ fill: "#9198A8", fontSize: 12 }} axisLine={{ stroke: "#232933" }} tickLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={110}
          tick={{ fill: "#E6E9EF", fontSize: 12 }}
          axisLine={{ stroke: "#232933" }}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.03)" }}
          contentStyle={{ background: "#171C24", border: "1px solid #232933", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#E6E9EF" }}
          formatter={(value: number, _name, payload) =>
            payload.payload.available ? [`${value}/100`, "Score"] : ["Unavailable", "Score"]
          }
        />
        <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={16}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.available ? scoreColor(entry.score) : "#232933"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SeverityDonut({ counts }: { counts: Record<Severity, number> }) {
  const data = (["critical", "high", "medium", "low"] as Severity[])
    .map((sev) => ({ name: sev, value: counts[sev] }))
    .filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-ink-muted">
        No vulnerabilities detected
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={224}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={56} outerRadius={80} paddingAngle={2} strokeWidth={0}>
          {data.map((entry, i) => (
            <Cell key={i} fill={SEVERITY_COLORS[entry.name as Severity]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: "#171C24", border: "1px solid #232933", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#E6E9EF", textTransform: "capitalize" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ContributorBarChart({ contributors }: { contributors: ContributorRecord[] }) {
  const data = contributors.slice(0, 8).map((c) => ({ name: c.login, percent: c.percentageOfTotal }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 34)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1C222C" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={{ fill: "#9198A8", fontSize: 12 }} axisLine={{ stroke: "#232933" }} tickLine={false} unit="%" />
        <YAxis
          type="category"
          dataKey="name"
          width={100}
          tick={{ fill: "#E6E9EF", fontSize: 12 }}
          axisLine={{ stroke: "#232933" }}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.03)" }}
          contentStyle={{ background: "#171C24", border: "1px solid #232933", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#E6E9EF" }}
          formatter={(value: number) => [`${value}%`, "Of contributions"]}
        />
        <Bar dataKey="percent" radius={[0, 4, 4, 0]} barSize={14} fill="#5B7CFA" />
      </BarChart>
    </ResponsiveContainer>
  );
}
