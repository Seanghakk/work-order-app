"use client";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";

// Unified status palette (see WO_STATUS_COLOR in app/dashboard/page.tsx) — used
// only as a fallback when a caller doesn't pass an explicit per-slice color.
const DEFAULT_COLORS = ["#0e5c86", "#0f9488", "#0a3f5c", "#d97706", "#16a34a", "#5b6b7a", "#dc2626"];

type DataPoint = { label: string; value: number; color?: string };

export function DonutChart({ data }: { data: DataPoint[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
      <div style={{ width: 160, height: 160, position: "relative", flexShrink: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="label" innerRadius={48} outerRadius={72} paddingAngle={2} strokeWidth={0}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{total}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>total</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 140 }}>
        {data.map((d, i) => (
          <div key={d.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: d.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length], display: "inline-block" }} />
              {d.label}
            </span>
            <strong>{d.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TrendChart({ data }: { data: { label: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0e5c86" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#0e5c86" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e1e5ea" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#5b6b7a" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#5b6b7a" }} axisLine={false} tickLine={false} allowDecimals={false} width={30} />
        <Tooltip />
        <Area type="monotone" dataKey="value" stroke="#0e5c86" strokeWidth={2} fill="url(#trendFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}