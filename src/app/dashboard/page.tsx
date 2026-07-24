"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import PremiumTopNav from "@/components/PremiumTopNav";
import { ExportBar } from "./ExportBar";
import { createClient } from "@/lib/supabase-browser";
import CountUp from "@/components/CountUp";
import ScrollReveal from "@/components/ScrollReveal";
import LoadingScreen from "@/components/LoadingScreen";
import Footer from "@/components/Footer";
import dynamic from "next/dynamic";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const DashboardMap = dynamic(() => import("@/components/DashboardMap"), {
  ssr: false,
  loading: () => (
    <div style={{ borderRadius: 16, marginBottom: 24, border: "1px solid #E2E8F0", height: "500px", width: "100%", background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", color: "#94A3B8", fontSize: 14 }}>
      Loading map...
    </div>
  ),
});

interface Accident {
  id: number; lat: number; lng: number; severity: string; vehicleTypes: string[];
  district: string; ward: string; junctionName: string; occurredAt: string;
  casualties: number; fatalities: number; injuries: number; verified: boolean;
  upvoteCount: number; intensity: number; photoUrl?: string; description?: string;
  weather?: string; roadCondition?: string;
}

interface Stats {
  total: number; fatal: number; serious: number; minor: number; critical: number;
  verified: number; pending: number; totalFatalities: number; totalCasualties: number;
  totalInjuries: number; junctionCount: number;
  severity: Record<string, number>; vehicles: Record<string, number>;
  monthly: { month: string; count: number }[];
  hourly: { hour: number; count: number }[];
  weekly: { day: string; count: number }[];
  currentYearMonthly: { month: string; count: number }[];
  byDistrict: { name: string; count: number }[];
  byWeather: { name: string; count: number }[];
  byRoadType: { name: string; count: number }[];
  hotspots: { name: string; count: number; fatal: number; severity: string }[];
  prediction: number;
  timeOfDay: { period: string; count: number }[];
}

const CHART_COLORS = ["#3B82F6", "#22C55E", "#FBBF24", "#F87171", "#A855F7", "#EC4899", "#14B8A6", "#F97316"];
const PIE_COLORS = ["#DC2626", "#FBBF24", "#3B82F6", "#22C55E"];
const HOURS = Array.from({ length: 24 }, (_, i) => ({ hour: i, label: `${i}:00` }));

async function fetchStats(url: string): Promise<Stats | null> {
  try { const r = await fetch(url); if (!r.ok) return null; const d = await r.json(); if (!d || d.error) return null; return d as Stats; } catch { return null; }
}

function ExportCSVButton({ stats }: { stats: Stats | null }) {
  const handleExport = () => {
    if (!stats) return;
    const rows = [["Metric", "Value"]];
    rows.push(["Total Accidents", stats.total.toString()]);
    rows.push(["Fatal", stats.fatal.toString()]);
    rows.push(["Serious", stats.serious.toString()]);
    rows.push(["Minor", stats.minor.toString()]);
    rows.push(["Critical", stats.critical.toString()]);
    rows.push(["Verified", stats.verified.toString()]);
    rows.push(["Total Fatalities", stats.totalFatalities.toString()]);
    rows.push(["Total Casualties", stats.totalCasualties.toString()]);
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "dashboard-stats.csv"; a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <button onClick={handleExport} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #E2E8F0", background: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#475569" }}>
      Export CSV
    </button>
  );
}

function ChartCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", padding: 20, borderRadius: 16, border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0F172A" }}>{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function Skeleton({ height = 200 }: { height?: number }) {
  return <div style={{ height, background: "#F1F5F9", borderRadius: 12, animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} />;
}

export default function DashboardPage() {
  const [accidents, setAccidents] = useState<Accident[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedHour, setSelectedHour] = useState("all");
  const [seriousMode, setSeriousMode] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [aiSummary, setAiSummary] = useState<{ text: string; provider?: string; loading: boolean; error?: string; lang: "en" | "sw" }>({ text: "", loading: true, lang: "en" });
  const [roleSyncStatus, setRoleSyncStatus] = useState<{ loading: boolean; message?: string; error?: string }>({ loading: false });

  // Filters
  const [filters, setFilters] = useState({
    dateRange: "", month: "", year: "", district: "", ward: "", severity: "", weather: "", roadType: ""
  });

  const handleFixRole = useCallback(async () => {
    setRoleSyncStatus({ loading: true });
    try {
      const res = await fetch("/api/auth/sync-role", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setRoleSyncStatus({ loading: false, message: `✅ Role: ${data.role}` });
        const stored = localStorage.getItem("rsd_user");
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.role = data.role;
          localStorage.setItem("rsd_user", JSON.stringify(parsed));
          window.dispatchEvent(new Event("rsd:user-changed"));
        }
      } else setRoleSyncStatus({ loading: false, error: data.error || "Failed" });
    } catch { setRoleSyncStatus({ loading: false, error: "Network error" }); }
    setTimeout(() => setRoleSyncStatus({ loading: false }), 5000);
  }, []);

  const fetchAiSummary = (lang: "en" | "sw" = "en") => {
    setAiSummary(s => ({ ...s, loading: true, lang, error: undefined }));
    fetch(`/api/ai-summary?lang=${lang}&fresh=1`)
      .then(r => r.json())
      .then(d => { if (d.ok) setAiSummary({ text: d.text, provider: d.provider, loading: false, lang }); else setAiSummary({ text: "", loading: false, error: d.hint || d.error || "AI unavailable", lang }); })
      .catch(err => setAiSummary({ text: "", loading: false, error: err?.message || "Network error", lang }));
  };

  useEffect(() => { fetchAiSummary("en"); }, []);
  useEffect(() => {
    fetch("/api/accidents").then(r => r.json()).then(setAccidents).catch(() => {});
    fetchStats("/api/stats").then(setStats);
    const stored = localStorage.getItem("rsd_user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const [loadingComplete, setLoadingComplete] = useState(false);

  const sevColors: Record<string, string> = { fatal: "#F87171", critical: "#FBBF24", serious: "#3B82F6", minor: "#22C55E" };
  const sevList = ["fatal", "critical", "serious", "minor"] as const;

  const districts = useMemo(() => [...new Set(accidents.map(a => a.district).filter(Boolean))].sort(), [accidents]);
  const filterOptions = useMemo(() => ({
    districts: [...new Set(accidents.map(a => a.district).filter(Boolean))].sort(),
    weathers: [...new Set(accidents.map(a => a.weather).filter(Boolean))].sort(),
    roadTypes: [...new Set(accidents.map(a => a.roadCondition).filter(Boolean))].sort(),
    years: [...new Set(accidents.map(a => new Date(a.occurredAt).getFullYear().toString()))].sort(),
  }), [accidents]);

  if (!loadingComplete) {
    return <LoadingScreen onComplete={() => setLoadingComplete(true)} />;
  }

  const selectStyle: React.CSSProperties = {
    padding: "6px 10px", border: "1px solid #E2E8F0", borderRadius: 8,
    fontSize: 12, minHeight: 36, background: "#fff", color: "#0F172A",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", display: "flex", flexDirection: "column" }}>
      <PremiumTopNav variant="dashboard" />

      <main style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 12px", position: "relative", zIndex: 1, flex: 1, width: "100%", boxSizing: "border-box" }}>
        {/* Filters Bar */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", padding: "12px 16px", background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", alignItems: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.04em" }}>Filters</span>
          <select value={filters.year} onChange={e => setFilters(f => ({...f, year: e.target.value}))} style={selectStyle}>
            <option value="">All Years</option>
            {filterOptions.years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={filters.month} onChange={e => setFilters(f => ({...f, month: e.target.value}))} style={selectStyle}>
            <option value="">All Months</option>
            {["01","02","03","04","05","06","07","08","09","10","11","12"].map(m => (
              <option key={m} value={m}>{new Date(2020, parseInt(m)-1).toLocaleString('en', { month: 'short' })}</option>
            ))}
          </select>
          <select value={filters.district} onChange={e => setFilters(f => ({...f, district: e.target.value}))} style={selectStyle}>
            <option value="">All Districts</option>
            {filterOptions.districts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={filters.severity} onChange={e => setFilters(f => ({...f, severity: e.target.value}))} style={selectStyle}>
            <option value="">All Severity</option>
            {sevList.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <select value={filters.weather} onChange={e => setFilters(f => ({...f, weather: e.target.value}))} style={selectStyle}>
            <option value="">All Weather</option>
            {filterOptions.weathers.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
          <select value={filters.roadType} onChange={e => setFilters(f => ({...f, roadType: e.target.value}))} style={selectStyle}>
            <option value="">All Road Types</option>
            {filterOptions.roadTypes.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <ExportCSVButton stats={stats} />
        </div>

        <ExportBar
          accidentCount={selectedHour === "all" ? accidents.length : accidents.filter(a => new Date(a.occurredAt).getHours() === parseInt(selectedHour)).length}
          selectedHour={selectedHour}
        />

        {/* AI Safety Summary */}
        <div style={{ marginBottom: 24, padding: "20px 24px", borderRadius: 16, background: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)", color: "#F8FAFC", boxShadow: "0 4px 24px rgba(15, 23, 42, 0.15)", position: "relative", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "#1E293B" }}>✦</div>
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#D4AF37" }}>AI Safety Brief</span>
                {aiSummary.provider && <span style={{ fontSize: 10, color: "#94A3B8", padding: "2px 6px", border: "1px solid #334155", borderRadius: 999 }}>via {aiSummary.provider === "cloudflare" ? "Llama 3.3 70B" : aiSummary.provider}</span>}
                {aiSummary.loading && <span style={{ fontSize: 10, color: "#94A3B8" }}>thinking...</span>}
                <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                  <button type="button" onClick={() => fetchAiSummary(aiSummary.lang === "sw" ? "en" : "sw")} style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", background: "transparent", border: "1px solid #334155", borderRadius: 999, padding: "2px 8px", cursor: "pointer" }}>{aiSummary.lang === "sw" ? "🇬🇧 EN" : "🇹🇿 SW"}</button>
                  <button type="button" onClick={() => fetchAiSummary(aiSummary.lang)} style={{ fontSize: 10, fontWeight: 700, color: "#D4AF37", background: "transparent", border: "1px solid #D4AF37", borderRadius: 999, padding: "2px 8px", cursor: "pointer" }}>↻ Refresh</button>
                </div>
              </div>
              {aiSummary.loading && !aiSummary.text ? (
                <div style={{ height: 48, background: "linear-gradient(90deg, #334155 0%, #475569 50%, #334155 100%)", backgroundSize: "200% 100%", borderRadius: 8, animation: "pulse 1.5s ease-in-out infinite" }} />
              ) : aiSummary.error ? (
                <div style={{ fontSize: 13, color: "#94A3B8", fontStyle: "italic" }}>AI summary unavailable.</div>
              ) : (
                <div style={{ fontSize: 14, lineHeight: 1.6, color: "#E2E8F0" }}>{aiSummary.text}</div>
              )}
            </div>
          </div>
        </div>

        {/* KPI Grid */}
        {stats && (
          <ScrollReveal>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
              {[
                { label: "Total Accidents", value: stats.total, color: "#3B82F6", icon: "📊" },
                { label: "Fatal", value: stats.fatal, color: "#DC2626", icon: "💔" },
                { label: "Serious Injuries", value: stats.serious, color: "#F87171", icon: "🏥" },
                { label: "Minor Injuries", value: stats.minor, color: "#22C55E", icon: "🩹" },
                { label: "Total Deaths", value: stats.totalFatalities, color: "#991B1B", icon: "⚠️" },
                { label: "Vehicles Involved", value: Object.values(stats.vehicles).reduce((a, b) => a + b, 0), color: "#A855F7", icon: "🚗" },
              ].map((kpi) => (
                <div key={kpi.label} style={{ background: "#fff", padding: "16px", borderRadius: 12, border: "1px solid #E2E8F0", borderTop: `3px solid ${kpi.color}`, textAlign: "center", cursor: "default", transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s" }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(15,23,42,0.08)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{kpi.icon}</div>
                  <CountUp end={kpi.value} style={{ fontFamily: '"Hubot Sans","Nunito","Quicksand",system-ui,sans-serif', fontSize: 28, fontWeight: 800, color: kpi.color }} />
                  <div style={{ fontSize: 11, color: "#475569", fontWeight: 600, marginTop: 4 }}>{kpi.label}</div>
                </div>
              ))}
            </div>
          </ScrollReveal>
        )}

        {/* Map Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, padding: "12px 16px", background: "#fff", borderRadius: 12, flexWrap: "wrap" }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em" }}>Filter by Hour</label>
          <select value={selectedHour} onChange={e => setSelectedHour(e.target.value)} style={{ padding: "8px 16px", border: "1px solid #E2E8F0", borderRadius: 12, fontSize: 14, minHeight: 44 }}>
            <option value="all">All Hours</option>
            {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{i}:00 - {(i + 1) % 24}:00</option>)}
          </select>
          <div style={{ width: 1, height: 28, background: "#E2E8F0", margin: "0 4px" }} />
          <button onClick={() => setSeriousMode(v => !v)} aria-pressed={seriousMode} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", minHeight: 44, borderRadius: 12, border: seriousMode ? "1px solid #DC2626" : "1px solid #E2E8F0", background: seriousMode ? "linear-gradient(135deg, #DC2626 0%, #991B1B 100%)" : "#fff", color: seriousMode ? "#fff" : "#475569", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: seriousMode ? "0 4px 14px rgba(220, 38, 38, 0.35)" : "none", transition: "all 0.15s ease" }}>
            <span aria-hidden style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: seriousMode ? "#fff" : "#DC2626", boxShadow: seriousMode ? "0 0 0 3px rgba(255,255,255,0.25)" : "none" }} />
            {seriousMode ? "Serious Mode: ON" : "Serious Mode"}
          </button>
        </div>

        {/* Map */}
        <DashboardMap accidents={accidents} selectedHour={selectedHour} seriousMode={seriousMode} />

        {/* Charts Grid */}
        {stats ? (
          <ScrollReveal>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 16, marginBottom: 24 }}>

              {/* 1. Monthly Accident Trend - Line Chart */}
              <ChartCard title="Monthly Accident Trend">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={stats.currentYearMonthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748B" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }} />
                    <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3, fill: "#3B82F6" }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* 2. Severity Distribution - Pie Chart */}
              <ChartCard title="Accident Severity Distribution">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={sevList.filter(s => (stats.severity[s] || 0) > 0).map(s => ({ name: s.charAt(0).toUpperCase() + s.slice(1), value: stats.severity[s] || 0 }))}
                      cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                      {sevList.filter(s => (stats.severity[s] || 0) > 0).map((s, i) => (
                        <Cell key={s} fill={PIE_COLORS[["fatal","critical","serious","minor"].indexOf(s)]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* 4. Accidents by District - Horizontal Bar Chart */}
              <ChartCard title="Accidents by District">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stats.byDistrict.slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "#64748B" }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#64748B" }} width={80} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }} />
                    <Bar dataKey="count" fill="#FBBF24" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* 5. Accidents by Weather - Doughnut Chart */}
              <ChartCard title="Accidents by Weather Condition">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={stats.byWeather.slice(0, 6).map(w => ({ name: w.name, value: w.count }))}
                      cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                      {stats.byWeather.slice(0, 6).map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* 6. Accidents by Road Type - Bar Chart */}
              <ChartCard title="Accidents by Road Condition">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stats.byRoadType.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} angle={-20} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }} />
                    <Bar dataKey="count" fill="#F87171" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* 7. Top 10 Accident Hotspots - Ranked Bar Chart */}
              <ChartCard title="Top 10 Accident Hotspots">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stats.hotspots} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "#64748B" }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "#64748B" }} width={120} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }} />
                    <Bar dataKey="count" fill="#A855F7" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* 8. Peak Accident Hours - Area Chart */}
              <ChartCard title="Peak Accident Hours">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={stats.hourly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "#64748B" }} tickFormatter={(h: any) => `${h}:00`} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }} labelFormatter={(h: any) => `${h}:00 - ${(h+1)%24}:00`} />
                    <Area type="monotone" dataKey="count" stroke="#F97316" fill="#F9731680" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Weekly Trend */}
              <ChartCard title="Weekly Accident Trend">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats.weekly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#64748B" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }} />
                    <Bar dataKey="count" fill="#14B8A6" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Time of Day Analysis */}
              <ChartCard title="Time of Day Analysis">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={stats.timeOfDay.map(t => ({ name: t.period.charAt(0).toUpperCase() + t.period.slice(1), value: t.count }))}
                      cx="50%" cy="50%" outerRadius={70} paddingAngle={3} dataKey="value">
                      {stats.timeOfDay.map((_, i) => <Cell key={i} fill={["#3B82F6","#FBBF24","#F87171","#6366F1"][i]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Prediction Card */}
              <ChartCard title="Accident Prediction (Next Month)">
                <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 0" }}>
                  <div style={{ fontSize: 36, fontWeight: 800, color: "#3B82F6", fontFamily: '"Hubot Sans","Nunito","Quicksand",system-ui,sans-serif' }}>
                    {stats.prediction}
                  </div>
                  <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.4 }}>
                    Predicted accidents<br />based on recent trend
                  </div>
                </div>
                <div style={{ height: 4, background: "#E2E8F0", borderRadius: 999 }}>
                  <div style={{ width: `${Math.min(100, (stats.prediction / Math.max(...stats.currentYearMonthly.map(m => m.count), 1)) * 100)}%`, height: "100%", background: "linear-gradient(90deg, #22C55E, #FBBF24, #F87171)", borderRadius: 999 }} />
                </div>
              </ChartCard>

            </div>
          </ScrollReveal>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 16, marginBottom: 24 }}>
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} height={260} />)}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
