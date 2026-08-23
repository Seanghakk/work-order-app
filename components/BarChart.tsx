type BarChartProps = {
  data: { label: string; value: number; color?: string }[];
  height?: number;
};

// A simple, dependency-free horizontal bar chart. Bars scale to the largest value in the set.
export default function BarChart({ data, height = 22 }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {data.map((d) => (
        <div key={d.label}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
            <span style={{ color: "var(--text-muted)" }}>{d.label}</span>
            <span style={{ fontWeight: 600 }}>{d.value}</span>
          </div>
          <div style={{ background: "var(--surface-hover)", borderRadius: 4, height, overflow: "hidden" }}>
            <div
              style={{
                width: `${(d.value / max) * 100}%`,
                height: "100%",
                background: d.color || "var(--navy)",
                borderRadius: 4,
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}