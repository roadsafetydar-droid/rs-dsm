"use client";

import { useMemo } from "react";

const SEV_LIST = ["fatal", "critical", "serious", "minor"] as const;
const SEV_CHART_COLORS = ["#DC2626", "#FBBF24", "#3B82F6", "#22C55E"];

interface MonthlyItem {
  month: string;
  count: number;
}

interface StatsInput {
  total: number;
  severity: Record<string, number>;
  monthly: MonthlyItem[];
}

function PieChart({ severity, total }: { severity: Record<string, number>; total: number }) {
  const segments = useMemo(() => {
    const totalVal = SEV_LIST.reduce((s, k) => s + (severity[k] || 0), 0);
    if (!totalVal) return [];
    let cumAngle = -Math.PI / 2;
    return SEV_LIST.map((k, i) => {
      const val = severity[k] || 0;
      const angle = (val / totalVal) * 2 * Math.PI;
      const start = cumAngle;
      const end = cumAngle + angle;
      cumAngle = end;
      const r = 80;
      const cx = 100, cy = 100;
      const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
      const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end);
      const large = angle > Math.PI ? 1 : 0;
      return { key: k, val, color: SEV_CHART_COLORS[i], path: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z` };
    });
  }, [severity]);

  return (
    <div style={{ textAlign: "center" }}>
      <h3 style={{ margin: "0 0 8px", fontFamily: '"Hubot Sans","Nunito","Quicksand",system-ui,sans-serif', fontSize: 16, fontWeight: 600 }}>Severity Distribution</h3>
      <svg viewBox="0 0 200 130" style={{ width: "100%", maxHeight: 160 }}>
        {segments.map(s => <path key={s.key} d={s.path} fill={s.color} stroke="#fff" strokeWidth={2} />)}
        <text x={100} y={105} textAnchor="middle" fontSize={13} fill="#475569" fontWeight={600}>{total} Total</text>
      </svg>
      <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", marginTop: 4 }}>
        {SEV_LIST.map((k, i) => {
          const val = severity[k] || 0;
          if (!val) return null;
          return (
            <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#475569" }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: SEV_CHART_COLORS[i], display: "inline-block" }} />
              {k.charAt(0).toUpperCase() + k.slice(1)} ({val})
            </span>
          );
        })}
      </div>
    </div>
  );
}

function BarChart({ data, color, height = 180 }: { data: { label: string; value: number }[]; color: string; height?: number }) {
  if (!data.length) return <p style={{ color: "#94A3B8", fontSize: 13, textAlign: "center", padding: 20 }}>No data</p>;
  const max = Math.max(...data.map(d => d.value), 1);
  const w = Math.max(40, Math.min(60, 520 / data.length));
  const pad = 8;
  const svgW = data.length * (w + pad) + 20;
  return (
    <svg viewBox={`0 0 ${svgW} ${height}`} style={{ width: "100%", height }} preserveAspectRatio="xMidYMid meet">
      {data.map((d, i) => {
        const barH = (d.value / max) * (height - 30);
        const x = 10 + i * (w + pad);
        const y = height - 25 - barH;
        return (
          <g key={d.label}>
            <rect x={x} y={y} width={w} height={barH} fill={color} rx={4} />
            <text x={x + w / 2} y={height - 8} textAnchor="middle" fontSize={10} fill="#64748B">{d.label}</text>
            {barH > 15 && <text x={x + w / 2} y={y + 14} textAnchor="middle" fontSize={10} fill="#fff" fontWeight={700}>{d.value}</text>}
          </g>
        );
      })}
    </svg>
  );
}

export default function DashboardCharts({ stats }: { stats: StatsInput }) {
  const monthlyBars = useMemo(() => {
    if (!stats?.monthly?.length) return [];
    return stats.monthly.map(m => ({
      label: (() => { const [y, mo] = m.month.split("-"); return `${y.slice(2)}/${mo}`; })(),
      value: m.count,
    }));
  }, [stats]);

  const annualBars = useMemo(() => {
    if (!stats?.monthly?.length) return [];
    const yearMap: Record<string, number> = {};
    stats.monthly.forEach(m => { const y = m.month.split("-")[0]; yearMap[y] = (yearMap[y] || 0) + m.count; });
    return Object.entries(yearMap).sort(([a], [b]) => a.localeCompare(b)).map(([y, c]) => ({ label: y, value: c }));
  }, [stats]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 16 }}>
      <div style={{ background: "#fff", padding: 20, borderRadius: 16, border: "1px solid #E2E8F0" }}>
        <PieChart severity={stats.severity} total={stats.total} />
      </div>
      <div style={{ background: "#fff", padding: 20, borderRadius: 16, border: "1px solid #E2E8F0" }}>
        <h3 style={{ margin: "0 0 8px", fontFamily: '"Hubot Sans","Nunito","Quicksand",system-ui,sans-serif', fontSize: 16, fontWeight: 600 }}>Monthly Trends</h3>
        <BarChart data={monthlyBars} color="#3B82F6" />
      </div>
      <div style={{ background: "#fff", padding: 20, borderRadius: 16, border: "1px solid #E2E8F0" }}>
        <h3 style={{ margin: "0 0 8px", fontFamily: '"Hubot Sans","Nunito","Quicksand",system-ui,sans-serif', fontSize: 16, fontWeight: 600 }}>Annual Trends</h3>
        <BarChart data={annualBars} color="#DC2626" />
      </div>
    </div>
  );
}
