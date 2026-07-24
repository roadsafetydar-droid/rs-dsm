"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import PremiumTopNav from "@/components/PremiumTopNav";
import CountUp from "@/components/CountUp";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

interface UserItem {
  id: number; email: string; username: string; firstName: string; lastName: string;
  isStaff: boolean; isSuperuser: boolean; isActive: boolean; dateJoined: string;
  profile: { role: string; phone: string; supabaseUid: string | null } | null;
}

interface Stats {
  total: number; fatal: number; serious: number; minor: number; critical: number;
  verified: number; pending: number; rejected: number;
  totalFatalities: number; totalCasualties: number; totalInjuries: number; junctionCount: number;
  severity: Record<string, number>; vehicles: Record<string, number>;
  monthly: { month: string; count: number }[];
  hourly: { hour: number; count: number }[];
  weekly: { day: string; count: number }[];
  daily: { date: string; count: number }[];
  currentYearMonthly: { month: string; count: number }[];
  byDistrict: { name: string; count: number }[];
  byWeather: { name: string; count: number }[];
  byRoadType: { name: string; count: number }[];
  hotspots: { name: string; count: number; fatal: number; severity: string }[];
  prediction: number;
  timeOfDay: { period: string; count: number }[];
}

const CHART_COLORS = ["#3B82F6","#22C55E","#FBBF24","#F87171","#A855F7","#EC4899","#14B8A6","#F97316","#6366F1","#84CC16"];
const PIE_COLORS = ["#DC2626","#FBBF24","#3B82F6","#22C55E"];

function Skeleton({ height = 200 }: { height?: number }) {
  return <div style={{ height, background: "#F1F5F9", borderRadius: 12, animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite" }} />;
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", padding: 20, borderRadius: 16, border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{title}</h3>
      {children}
    </div>
  );
}

export default function AuthorityPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "analytics" | "users" | "reports">("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLoading, setUserLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [actionId, setActionId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const loadUsers = useCallback(async () => {
    setUserLoading(true); setError("");
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) { if (res.status === 403) { setError("Permission denied."); return; } throw new Error(`HTTP ${res.status}`); }
      const data = await res.json();
      setUsers(data.users || []);
    } catch (e: any) { setError(e?.message || "Failed to load users"); }
    finally { setUserLoading(false); }
  }, []);

  useEffect(() => { if (activeTab === "users") loadUsers(); }, [activeTab, loadUsers]);

  const handleRoleChange = async (userId: number, role: string) => {
    setActionId(userId); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, action: "update_role", role }) });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      setSuccess(`Role updated to ${role}`); loadUsers();
    } catch (e: any) { setError(e?.message || "Failed"); }
    finally { setActionId(null); }
  };

  const handleToggleSuperuser = async (userId: number, currentValue: boolean) => {
    setActionId(userId); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, action: "update_flags", isSuperuser: !currentValue }) });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      setSuccess(`Admin ${!currentValue ? "granted" : "revoked"}`); loadUsers();
    } catch (e: any) { setError(e?.message || "Failed"); }
    finally { setActionId(null); }
  };

  const handleToggleActive = async (userId: number, currentValue: boolean) => {
    setActionId(userId); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, action: "update_flags", isActive: !currentValue }) });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      setSuccess(`User ${!currentValue ? "activated" : "deactivated"}`); loadUsers();
    } catch (e: any) { setError(e?.message || "Failed"); }
    finally { setActionId(null); }
  };

  const sevColors: Record<string, string> = { fatal: "#DC2626", critical: "#FBBF24", serious: "#3B82F6", minor: "#22C55E" };

  const tabs = [
    { key: "overview", label: "📊 Overview" },
    { key: "analytics", label: "📈 Analytics" },
    { key: "users", label: "👥 Users" },
    { key: "reports", label: "📋 Reports" },
  ] as const;

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC" }}>
      <PremiumTopNav variant="authority" />
      <main style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 16px" }}>

        <div style={{ marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0F172A" }}>🏛️ Authority Console</h2>
          <p style={{ margin: "4px 0 0", color: "#64748B", fontSize: 14 }}>Advanced analytics and system administration</p>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#F1F5F9", borderRadius: 12, padding: 4 }}>
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              flex: 1, padding: "10px 20px", border: "none", borderRadius: 10,
              background: activeTab === tab.key ? "#fff" : "transparent",
              color: activeTab === tab.key ? "#0F172A" : "#64748B",
              fontSize: 14, fontWeight: 700, cursor: "pointer",
              boxShadow: activeTab === tab.key ? "0 1px 3px rgba(15,23,42,0.08)" : "none", transition: "all 0.15s",
            }}>{tab.label}</button>
          ))}
        </div>

        {error && (
          <div style={{ padding: "12px 16px", borderRadius: 10, marginBottom: 16, background: "#FEE2E2", color: "#DC2626", fontSize: 13, fontWeight: 500, border: "1px solid #FECACA" }}>
            {error} <button onClick={() => setError("")} style={{ float: "right", background: "none", border: "none", cursor: "pointer", color: "#DC2626" }}>✕</button>
          </div>
        )}
        {success && (
          <div style={{ padding: "12px 16px", borderRadius: 10, marginBottom: 16, background: "#DCFCE7", color: "#15803D", fontSize: 13, fontWeight: 500, border: "1px solid #BBF7D0" }}>
            {success} <button onClick={() => setSuccess("")} style={{ float: "right", background: "none", border: "none", cursor: "pointer", color: "#15803D" }}>✕</button>
          </div>
        )}

        {/* ===== OVERVIEW TAB ===== */}
        {activeTab === "overview" && stats && (
          <>
            {/* KPI Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 28 }}>
              {[
                { label: "Total Reports", value: stats.total, color: "#3B82F6" },
                { label: "Pending Reports", value: stats.pending, color: "#FBBF24" },
                { label: "Verified Reports", value: stats.verified, color: "#22C55E" },
                { label: "Fatal Accidents", value: stats.fatal, color: "#DC2626" },
                { label: "Serious Injuries", value: stats.serious, color: "#F87171" },
                { label: "Minor Injuries", value: stats.minor, color: "#22C55E" },
                { label: "Active Users", value: users.length || "—", color: "#A855F7" },
                { label: "Police Stations", value: "5", color: "#F97316" },
              ].map(kpi => (
                <div key={kpi.label} style={{ background: "#fff", padding: 16, borderRadius: 12, border: "1px solid #E2E8F0", borderTop: `3px solid ${kpi.color}` }}>
                  <div style={{ fontFamily: '"Hubot Sans","Nunito","Quicksand",system-ui,sans-serif', fontSize: 26, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
                  <div style={{ fontSize: 11, color: "#475569", fontWeight: 600, marginTop: 4 }}>{kpi.label}</div>
                </div>
              ))}
            </div>

            {/* Overview Charts */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16, marginBottom: 24 }}>
              <ChartCard title="Monthly Accident Trend">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={stats.currentYearMonthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748B" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }} />
                    <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Severity Distribution">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={["fatal","critical","serious","minor"].filter(s => (stats.severity[s]||0) > 0).map(s => ({ name: s.charAt(0).toUpperCase()+s.slice(1), value: stats.severity[s]||0 }))}
                      cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                      {["fatal","critical","serious","minor"].filter(s => (stats.severity[s]||0) > 0).map((s, i) => <Cell key={s} fill={PIE_COLORS[["fatal","critical","serious","minor"].indexOf(s)]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Vehicle Types">
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {Object.entries(stats.vehicles).map(([v, count]) => (
                    <div key={v}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#475569", marginBottom: 2 }}>
                        <span style={{ textTransform: "capitalize" }}>{v}</span>
                        <span style={{ fontWeight: 700 }}>{count}</span>
                      </div>
                      <div style={{ height: 6, background: "#E2E8F0", borderRadius: 999 }}>
                        <div style={{ width: `${(count / stats.total) * 100}%`, height: "100%", background: "#A855F7", borderRadius: 999 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </ChartCard>

              <ChartCard title="Peak Accident Hours">
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={stats.hourly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "#64748B" }} tickFormatter={(h: number) => `${h}:00`} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }} />
                    <Area type="monotone" dataKey="count" stroke="#F97316" fill="#F9731680" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            {/* Quick Actions */}
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E2E8F0", padding: 24 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700 }}>Quick Actions</h3>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button onClick={() => setActiveTab("analytics")} style={{ padding: "10px 20px", borderRadius: 10, background: "#3B82F6", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>📈 View Analytics</button>
                <button onClick={() => setActiveTab("users")} style={{ padding: "10px 20px", borderRadius: 10, background: "#A855F7", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>👥 Manage Users</button>
                <button onClick={() => setActiveTab("reports")} style={{ padding: "10px 20px", borderRadius: 10, background: "#FBBF24", color: "#92400E", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>📋 Review Reports</button>
                <a href="/editor" style={{ display: "inline-flex", alignItems: "center", padding: "10px 20px", borderRadius: 10, background: "#F1F5F9", color: "#475569", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>Open Editor Queue →</a>
              </div>
            </div>
          </>
        )}

        {/* ===== ANALYTICS TAB ===== */}
        {activeTab === "analytics" && (
          <>
            {loading ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
                {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} height={260} />)}
              </div>
            ) : stats ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>

                {/* Monthly Trend */}
                <ChartCard title="📈 Monthly Accident Trend">
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={stats.currentYearMonthly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748B" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }} />
                      <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Weekly Trend */}
                <ChartCard title="📅 Weekly Accident Trend">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={stats.weekly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#64748B" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }} />
                      <Bar dataKey="count" fill="#14B8A6" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Daily Trend */}
                <ChartCard title="📆 Daily Accident Trend (Last 30 Days)">
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={stats.daily.slice(-30)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#64748B" }} tickFormatter={(d: string) => d.slice(5)} />
                      <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }} />
                      <Area type="monotone" dataKey="count" stroke="#6366F1" fill="#6366F140" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Prediction */}
                <ChartCard title="🔮 Accident Prediction">
                  <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "16px 0" }}>
                    <div style={{ fontSize: 42, fontWeight: 800, color: "#3B82F6", fontFamily: '"Hubot Sans","Nunito","Quicksand",system-ui,sans-serif' }}>{stats.prediction}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>Next Month Projection</div>
                      <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>Based on linear regression of recent {stats.monthly.length} months</div>
                    </div>
                  </div>
                  <div style={{ height: 6, background: "#E2E8F0", borderRadius: 999 }}>
                    <div style={{ width: `${Math.min(100, (stats.prediction / Math.max(...stats.currentYearMonthly.map(m => m.count), 1)) * 100)}%`, height: "100%", background: "linear-gradient(90deg, #22C55E, #FBBF24, #F87171)", borderRadius: 999 }} />
                  </div>
                </ChartCard>

                {/* Top Dangerous Districts */}
                <ChartCard title="📍 Top Dangerous Districts">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={stats.byDistrict.slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: "#64748B" }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#64748B" }} width={80} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }} />
                      <Bar dataKey="count" fill="#F87171" radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Top Dangerous Hotspots */}
                <ChartCard title="⚠️ Top Dangerous Roads / Hotspots">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={stats.hotspots} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: "#64748B" }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "#64748B" }} width={120} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }} />
                      <Bar dataKey="count" fill="#DC2626" radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Severity Trend */}
                <ChartCard title="📊 Accident Severity Trend">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={["fatal","critical","serious","minor"].filter(s => (stats.severity[s]||0) > 0).map(s => ({ name: s.charAt(0).toUpperCase()+s.slice(1), value: stats.severity[s]||0 }))}
                        cx="50%" cy="50%" outerRadius={80} paddingAngle={3} dataKey="value">
                        {["fatal","critical","serious","minor"].filter(s => (stats.severity[s]||0) > 0).map((s, i) => <Cell key={s} fill={PIE_COLORS[["fatal","critical","serious","minor"].indexOf(s)]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Time of Day */}
                <ChartCard title="🕐 Time-of-Day Accident Analysis">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={stats.timeOfDay.map(t => ({ name: t.period.charAt(0).toUpperCase()+t.period.slice(1), value: t.count }))}
                        cx="50%" cy="50%" outerRadius={75} paddingAngle={3} dataKey="value">
                        {stats.timeOfDay.map((_, i) => <Cell key={i} fill={["#3B82F6","#FBBF24","#F87171","#6366F1"][i]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Weather Impact */}
                <ChartCard title="🌤️ Weather Impact Analysis">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={stats.byWeather.slice(0, 6)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }} />
                      <Bar dataKey="count" fill="#3B82F6" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Road Condition */}
                <ChartCard title="🛣️ Road Condition Analysis">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={stats.byRoadType.slice(0, 6)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }} />
                      <Bar dataKey="count" fill="#22C55E" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Vehicle Type */}
                <ChartCard title="🚗 Vehicle Type Distribution">
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {Object.entries(stats.vehicles).map(([v, count], i) => (
                      <div key={v}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#475569", marginBottom: 2 }}>
                          <span style={{ textTransform: "capitalize" }}>{v}</span>
                          <span style={{ fontWeight: 700 }}>{count}</span>
                        </div>
                        <div style={{ height: 6, background: "#E2E8F0", borderRadius: 999 }}>
                          <div style={{ width: `${(count / stats.total) * 100}%`, height: "100%", background: CHART_COLORS[i % CHART_COLORS.length], borderRadius: 999 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </ChartCard>

                {/* Peak Hours */}
                <ChartCard title="⏰ Peak Accident Hours">
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={stats.hourly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "#64748B" }} tickFormatter={(h: number) => `${h}:00`} />
                      <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }} />
                      <Area type="monotone" dataKey="count" stroke="#F97316" fill="#F9731680" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Reporting Performance */}
                <ChartCard title="📋 Accident Reporting Performance">
                  <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "8px 0" }}>
                    {[
                      { label: "Verified Rate", value: stats.total > 0 ? Math.round((stats.verified / stats.total) * 100) : 0, color: "#22C55E" },
                      { label: "Pending Rate", value: stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0, color: "#FBBF24" },
                      { label: "Rejected Rate", value: stats.total > 0 ? Math.round(((stats.rejected||0) / stats.total) * 100) : 0, color: "#DC2626" },
                      { label: "Fatal Incident Rate", value: stats.total > 0 ? Math.round((stats.fatal / stats.total) * 100) : 0, color: "#991B1B" },
                    ].map(item => (
                      <div key={item.label}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#475569", marginBottom: 2 }}>
                          <span style={{ fontWeight: 600 }}>{item.label}</span>
                          <span style={{ fontWeight: 700 }}>{item.value}%</span>
                        </div>
                        <div style={{ height: 8, background: "#E2E8F0", borderRadius: 999 }}>
                          <div style={{ width: `${item.value}%`, height: "100%", background: item.color, borderRadius: 999 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </ChartCard>

                {/* Average Response Time (estimated) */}
                <ChartCard title="⏱️ Average Response Metrics">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: "12px 0" }}>
                    {[
                      { label: "Avg. Report Time", value: "—", desc: "Data not available" },
                      { label: "Avg. Verification", value: stats.verified > 0 ? "~24h" : "—", desc: "Estimated" },
                      { label: "Total Active Users", value: users.length.toString(), desc: "Registered" },
                      { label: "Reports Per Day", value: stats.total > 0 ? (stats.total / Math.max(stats.daily.length, 1)).toFixed(1) : "0", desc: "Average" },
                    ].map(item => (
                      <div key={item.label} style={{ textAlign: "center", padding: "12px", background: "#F8FAFC", borderRadius: 12 }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: "#3B82F6", fontFamily: '"Hubot Sans","Nunito","Quicksand",system-ui,sans-serif' }}>{item.value}</div>
                        <div style={{ fontSize: 11, color: "#475569", fontWeight: 600, marginTop: 4 }}>{item.label}</div>
                        <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>{item.desc}</div>
                      </div>
                    ))}
                  </div>
                </ChartCard>

              </div>
            ) : (
              <div style={{ textAlign: "center", padding: 60, color: "#94A3B8", fontSize: 14 }}>No analytics data available.</div>
            )}
          </>
        )}

        {/* ===== USERS TAB ===== */}
        {activeTab === "users" && (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E2E8F0", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>👥 User Management</h3>
                <p style={{ margin: "2px 0 0", fontSize: 13, color: "#64748B" }}>{users.length} user{users.length !== 1 ? "s" : ""} registered</p>
              </div>
              <button onClick={loadUsers} disabled={userLoading} style={{ padding: "8px 16px", borderRadius: 8, background: "#F1F5F9", color: "#475569", border: "1px solid #E2E8F0", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                {userLoading ? "⟳ Loading..." : "⟳ Refresh"}
              </button>
            </div>
            {userLoading ? (
              <div style={{ textAlign: "center", padding: 40, color: "#94A3B8" }}>Loading users...</div>
            ) : users.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "#94A3B8" }}>No users found.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                      <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "#475569" }}>User</th>
                      <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "#475569" }}>Email</th>
                      <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 600, color: "#475569" }}>Role</th>
                      <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 600, color: "#475569" }}>Admin</th>
                      <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 600, color: "#475569" }}>Active</th>
                      <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600, color: "#475569" }}>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => {
                      const currentRole = u.profile?.role || "community";
                      return (
                        <tr key={u.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ fontWeight: 600, color: "#0F172A" }}>{u.firstName} {u.lastName}</div>
                            <div style={{ fontSize: 11, color: "#94A3B8" }}>@{u.username}</div>
                          </td>
                          <td style={{ padding: "12px 16px", color: "#475569" }}>{u.email}</td>
                          <td style={{ padding: "12px 16px", textAlign: "center" }}>
                            <select value={currentRole} onChange={e => handleRoleChange(u.id, e.target.value)} disabled={actionId === u.id} style={{
                              padding: "6px 10px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12, background: "#fff", cursor: "pointer",
                              fontWeight: currentRole === "admin" ? 700 : 400,
                              color: currentRole === "admin" ? "#DC2626" : currentRole === "police" ? "#3B82F6" : currentRole === "tanroads" ? "#FBBF24" : "#475569",
                            }}>
                              <option value="police">🚦 Traffic Police</option>
                              <option value="tanroads">🏗️ TANROADS</option>
                              <option value="admin">⭐ Admin</option>
                            </select>
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "center" }}>
                            <button onClick={() => handleToggleSuperuser(u.id, u.isSuperuser)} disabled={actionId === u.id} style={{
                              padding: "4px 12px", borderRadius: 999, border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer",
                              background: u.isSuperuser ? "#FEE2E2" : "#F1F5F9", color: u.isSuperuser ? "#DC2626" : "#94A3B8",
                            }}>{u.isSuperuser ? "✓ Admin" : "—"}</button>
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "center" }}>
                            <button onClick={() => handleToggleActive(u.id, u.isActive)} disabled={actionId === u.id} style={{
                              padding: "4px 12px", borderRadius: 999, border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer",
                              background: u.isActive ? "#DCFCE7" : "#FEE2E2", color: u.isActive ? "#166534" : "#DC2626",
                            }}>{u.isActive ? "Active" : "Inactive"}</button>
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right", color: "#94A3B8", fontSize: 11 }}>{new Date(u.dateJoined).toLocaleDateString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ===== REPORTS TAB ===== */}
        {activeTab === "reports" && (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E2E8F0", padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 600 }}>Report Management</h3>
            <p style={{ color: "#64748B", fontSize: 14, margin: "0 0 20px" }}>Use the full-featured editor queue to verify, reject, and manage accident reports.</p>
            <a href="/editor" style={{ display: "inline-block", padding: "14px 32px", borderRadius: 999, background: "#3B82F6", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 15 }}>
              Open Editor Queue →
            </a>
          </div>
        )}

      </main>
    </div>
  );
}
