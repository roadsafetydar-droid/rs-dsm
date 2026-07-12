"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import PremiumTopNav from "@/components/PremiumTopNav";
import { ExportBar } from "./ExportBar";

interface Accident {
  id: number;
  lat: number;
  lng: number;
  severity: string;
  vehicleTypes: string[];
  district: string;
  junctionName: string;
  occurredAt: string;
  casualties: number;
  fatalities: number;
  verified: boolean;
  upvoteCount: number;
  intensity: number;
  photoUrl?: string;
  description?: string;
}

interface Stats {
  total: number;
  fatal: number;
  serious: number;
  minor: number;
  critical: number;
  verified: number;
  totalFatalities: number;
  totalCasualties: number;
  junctionCount: number;
  severity: Record<string, number>;
  vehicles: Record<string, number>;
  monthly: { month: string; count: number }[];
  hourly: { hour: number; count: number }[];
}

type Mood = "sad" | "tragic" | "hopeful" | "miraculous";
const MOOD_META: Record<Mood, { emoji: string; label: string; color: string }> = {
  sad:        { emoji: "😔", label: "Sad",        color: "#3B82F6" },
  tragic:     { emoji: "💔", label: "Tragic",     color: "#DC2626" },
  hopeful:    { emoji: "🤝", label: "Hopeful",    color: "#22C55E" },
  miraculous: { emoji: "✨", label: "Miraculous", color: "#A855F7" },
};

/** Extracts [mood:X] from the description and returns the cleaned text + mood. */
function splitMood(description?: string | null): { text: string; mood: Mood | null } {
  if (!description) return { text: "", mood: null };
  const m = /^\[mood:(sad|tragic|hopeful|miraculous)\]\s*/i.exec(description);
  if (!m) return { text: description, mood: null };
  return { text: description.slice(m[0].length), mood: m[1].toLowerCase() as Mood };
}

/** Safely parse an API response into an array of accidents. */
async function fetchAccidents(url: string): Promise<Accident[]> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[dashboard] fetchAccidents returned ${res.status}`);
      return [];
    }
    const data = await res.json();
    // If the API returns an error object instead of an array, handle gracefully
    if (!Array.isArray(data)) {
      if (data && typeof data === "object" && "error" in data) {
        console.warn("[dashboard] API returned error:", data.error, data.detail);
      }
      return [];
    }
    return data as Accident[];
  } catch (err) {
    console.error("[dashboard] fetchAccidents network error:", err);
    return [];
  }
}

/** Safely parse an API response into Stats. */
async function fetchStats(url: string): Promise<Stats | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[dashboard] fetchStats returned ${res.status}`);
      return null;
    }
    const data = await res.json();
    if (!data || typeof data !== "object" || "error" in data) {
      console.warn("[dashboard] Stats API returned error:", data?.error);
      return null;
    }
    return data as Stats;
  } catch (err) {
    console.error("[dashboard] fetchStats network error:", err);
    return null;
  }
}

export default function DashboardPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const heatRef = useRef<any>(null);
  const [accidents, setAccidents] = useState<Accident[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedHour, setSelectedHour] = useState("all");
  const [seriousMode, setSeriousMode] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [aiSummary, setAiSummary] = useState<{
    text: string;
    provider?: string;
    loading: boolean;
    error?: string;
    lang: "en" | "sw";
  }>({ text: "", loading: true, lang: "en" });

  // Fetch AI safety summary once on mount.
  const fetchAiSummary = (lang: "en" | "sw" = "en") => {
    setAiSummary((s) => ({ ...s, loading: true, lang, error: undefined }));
    fetch(`/api/ai-summary?lang=${lang}&fresh=1`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setAiSummary({ text: d.text, provider: d.provider, loading: false, lang });
        else setAiSummary({ text: "", loading: false, error: d.hint || d.error || "AI unavailable", lang });
      })
      .catch((err) => {
        setAiSummary({ text: "", loading: false, error: err?.message || "Network error", lang });
      });
  };
  useEffect(() => {
    fetchAiSummary("en");
  }, []);

  useEffect(() => {
    fetchAccidents("/api/accidents").then(setAccidents);
    fetchStats("/api/stats").then(setStats);
    // Check stored user
    const stored = localStorage.getItem("rsd_user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    const map = L.map(mapRef.current).setView([-6.7924, 39.2083], 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapInstanceRef.current) return;

    const map = mapInstanceRef.current;

    // Clear old markers
    markersRef.current.forEach((m: any) => map.removeLayer(m));
    markersRef.current = [];

    // Clear old heatmap
    if (heatRef.current) {
      map.removeLayer(heatRef.current);
      heatRef.current = null;
    }

    const filtered = selectedHour === "all"
      ? accidents
      : accidents.filter((a) => {
          const h = new Date(a.occurredAt).getHours();
          return h === parseInt(selectedHour);
        });
    // Serious mode: only fatal + critical + serious, and require verified OR has applauds
    const displayList = seriousMode
      ? filtered
          .filter((a) => ["fatal", "critical", "serious"].includes(a.severity))
          .filter((a) => a.verified || a.upvoteCount > 0)
          .sort((a, b) => {
            // Verified-with-fatalities first, then by applauds, then recency
            const sevWeight = (s: string) =>
              s === "fatal" ? 3 : s === "critical" ? 2 : 1;
            if (sevWeight(b.severity) !== sevWeight(a.severity)) {
              return sevWeight(b.severity) - sevWeight(a.severity);
            }
            if (b.upvoteCount !== a.upvoteCount) {
              return b.upvoteCount - a.upvoteCount;
            }
            return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
          })
      : filtered;

    // Build heatmap points safely: Leaflet-heat can throw/behave oddly if it receives invalid points
    // (empty arrays, NaN/Infinity, or missing intensity).
    const points = filtered
      .map((a) => {
        const lat = Number(a.lat);
        const lng = Number(a.lng);
        const intensity = Number((a as any).intensity);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        if (!Number.isFinite(intensity)) return null;
        return [lat, lng, intensity] as [number, number, number];
      })
      .filter(Boolean) as [number, number, number][];

    if (points.length > 0) {
      heatRef.current = (L as any).heatLayer(points, {
        radius: 25,
        blur: 15,
        maxZoom: 10,
        max: 4,
        gradient: { 0.4: "#22C55E", 0.6: "#FBBF24", 0.8: "#F87171", 1: "#DC2626" },
      }).addTo(map);
    }


    // Add markers with popups
    displayList.forEach((a) => {
      const sevColors: Record<string, string> = { fatal: "#DC2626", critical: "#FBBF24", serious: "#3B82F6", minor: "#22C55E" };
      const photoHtml = a.photoUrl
        ? `<img src="${a.photoUrl}" alt="Accident photo" style="width:100%; max-height:150px; object-fit:cover; border-radius:8px; margin-bottom:8px;">`
        : "";
      const { text: cleanDesc, mood } = splitMood(a.description);
      const moodMeta = mood ? MOOD_META[mood] : null;
      const moodBadge = moodMeta
        ? `<span title="How the reporter said it felt" style="display:inline-flex; align-items:center; gap:4px; margin-left:6px; padding:2px 8px; border-radius:999px; font-size:11px; font-weight:700; background:${moodMeta.color}22; color:${moodMeta.color};">${moodMeta.emoji} ${moodMeta.label}</span>`
        : "";
      const html = `
        <div style="min-width:220px; font-family:system-ui,sans-serif;">
          ${photoHtml}
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
            <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${sevColors[a.severity]};"></span>
            <strong style="font-size:14px; text-transform:capitalize;">${a.severity}</strong>${moodBadge}
          </div>
          <div style="font-size:12px; color:#475569; margin-bottom:2px;"><strong>${a.junctionName}</strong>${a.district ? `, ${a.district}` : ""}</div>
          <div style="font-size:12px; color:#64748B;">${new Date(a.occurredAt).toLocaleDateString()}</div>
          ${cleanDesc ? `<div style="font-size:12px; color:#475569; margin-top:4px; border-top:1px solid #E2E8F0; padding-top:4px;">${cleanDesc}</div>` : ""}
        </div>`;
      const marker = L.circleMarker([a.lat, a.lng], {
        radius: 6,
        color: sevColors[a.severity],
        fillColor: sevColors[a.severity],
        fillOpacity: 0.8,
        weight: 1,
      }).addTo(map);
      marker.bindPopup(html);
      markersRef.current.push(marker);
    });
  }, [accidents, selectedHour, seriousMode]);

  const sevColors: Record<string, string> = {
    fatal: "#F87171",
    critical: "#FBBF24",
    serious: "#3B82F6",
    minor: "#22C55E",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC" }}>
      <PremiumTopNav variant="dashboard" />

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px", position: "relative", zIndex: 1 }}>
        {/* Export bar — sits at the top, dominant control surface */}
        <ExportBar
          accidentCount={
            selectedHour === "all"
              ? accidents.length
              : accidents.filter(
                  (a) =>
                    new Date(a.occurredAt).getHours() ===
                    parseInt(selectedHour)
                ).length
          }
          selectedHour={selectedHour}
        />

        {/* AI Safety Summary Banner */}
        <div style={{
          marginBottom: 24,
          padding: "20px 24px",
          borderRadius: 16,
          background: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)",
          color: "#F8FAFC",
          boxShadow: "0 4px 24px rgba(15, 23, 42, 0.15)",
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            <div style={{
              flexShrink: 0,
              width: 44, height: 44, borderRadius: 12,
              background: "linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, fontWeight: 800, color: "#1E293B",
            }}>✦</div>
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#D4AF37" }}>
                  AI Safety Brief
                </span>
                {aiSummary.provider && (
                  <span style={{ fontSize: 10, color: "#94A3B8", padding: "2px 6px", border: "1px solid #334155", borderRadius: 999 }}>
                    via {aiSummary.provider === "cloudflare" ? "Llama 3.3 70B" : aiSummary.provider}
                  </span>
                )}
                {aiSummary.loading && (
                  <span style={{ fontSize: 10, color: "#94A3B8" }}>thinking…</span>
                )}
                <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => fetchAiSummary(aiSummary.lang === "sw" ? "en" : "sw")}
                    title="Toggle language"
                    style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", background: "transparent", border: "1px solid #334155", borderRadius: 999, padding: "2px 8px", cursor: "pointer" }}
                  >
                    {aiSummary.lang === "sw" ? "🇬🇧 EN" : "🇹🇿 SW"}
                  </button>
                  <button
                    type="button"
                    onClick={() => fetchAiSummary(aiSummary.lang)}
                    title="Regenerate from latest data"
                    style={{ fontSize: 10, fontWeight: 700, color: "#D4AF37", background: "transparent", border: "1px solid #D4AF37", borderRadius: 999, padding: "2px 8px", cursor: "pointer" }}
                  >
                    ↻ Refresh
                  </button>
                </div>
              </div>
              {aiSummary.loading && !aiSummary.text ? (
                <div style={{ height: 48, background: "linear-gradient(90deg, #334155 0%, #475569 50%, #334155 100%)", backgroundSize: "200% 100%", borderRadius: 8, animation: "pulse 1.5s ease-in-out infinite" }} />
              ) : aiSummary.error ? (
                <div style={{ fontSize: 13, color: "#94A3B8", fontStyle: "italic" }}>
                  AI summary unavailable. {aiSummary.error.includes("GROQ_API_KEY") || aiSummary.error.includes("CLOUDFLARE_API_TOKEN") ? "Add an API key in landing/.env to enable." : aiSummary.error}
                </div>
              ) : (
                <div style={{ fontSize: 14, lineHeight: 1.6, color: "#E2E8F0" }}>
                  {aiSummary.text}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* KPI Grid */}
        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 24 }}>
            {[
              { label: "Total Reports", value: stats.total, color: "#F87171" },
              { label: "Verified", value: stats.verified, color: "#22C55E" },
              { label: "Fatal", value: stats.fatal, color: "#F87171" },
              { label: "Critical", value: stats.critical, color: "#FBBF24" },
              { label: "Serious", value: stats.serious, color: "#3B82F6" },
              { label: "Junctions", value: stats.junctionCount, color: "#A855F7" },
            ].map((kpi) => (
              <div key={kpi.label} style={{ background: "#fff", padding: "16px", borderRadius: 16, border: "1px solid #E2E8F0", borderTop: `3px solid ${kpi.color}`, textAlign: "center" }}>
                <div style={{ fontFamily: '"Hubot Sans","Nunito","Quicksand",system-ui,sans-serif', fontSize: 28, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
                <div style={{ fontSize: 13, color: "#475569", fontWeight: 600, marginTop: 4 }}>{kpi.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Map controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, padding: "12px 16px", background: "#fff", borderRadius: 12, flexWrap: "wrap" }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Filter by Hour
          </label>
          <select
            value={selectedHour}
            onChange={(e) => setSelectedHour(e.target.value)}
            style={{ padding: "8px 16px", border: "1px solid #E2E8F0", borderRadius: 12, fontSize: 14, minHeight: 44 }}
          >
            <option value="all">All Hours</option>
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>{i}:00 - {(i + 1) % 24}:00</option>
            ))}
          </select>

          <div style={{ width: 1, height: 28, background: "#E2E8F0", margin: "0 4px" }} />

          {/* Serious mode toggle */}
          <button
            onClick={() => setSeriousMode((v) => !v)}
            aria-pressed={seriousMode}
            title="Show only fatal, critical and serious incidents — sorted by applauds + recency"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              minHeight: 44,
              borderRadius: 12,
              border: seriousMode ? "1px solid #DC2626" : "1px solid #E2E8F0",
              background: seriousMode
                ? "linear-gradient(135deg, #DC2626 0%, #991B1B 100%)"
                : "#fff",
              color: seriousMode ? "#fff" : "#475569",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: seriousMode ? "0 4px 14px rgba(220, 38, 38, 0.35)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            <span aria-hidden style={{
              display: "inline-block",
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: seriousMode ? "#fff" : "#DC2626",
              boxShadow: seriousMode ? "0 0 0 3px rgba(255,255,255,0.25)" : "none",
            }} />
            {seriousMode ? "Serious Mode: ON" : "Serious Mode"}
          </button>
          {seriousMode && (
            <span style={{ fontSize: 12, color: "#64748B", marginLeft: 4 }}>
              Showing fatal / critical / serious, verified or with applauds.
            </span>
          )}
        </div>

        {/* Map */}
        <div ref={mapRef} style={{ height: 480, borderRadius: 16, overflow: "hidden", marginBottom: 24, border: "1px solid #E2E8F0" }}>
          {!accidents.length && (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94A3B8", fontSize: 14 }}>
              Loading map data...
            </div>
          )}
        </div>

        {/* Serious Incidents feed — only renders when Serious Mode is ON */}
        {seriousMode && (() => {
          // Re-derive the same list the map uses so feed and map stay in sync
          const hourFiltered = selectedHour === "all"
            ? accidents
            : accidents.filter((a) => new Date(a.occurredAt).getHours() === parseInt(selectedHour));
          const list = hourFiltered
            .filter((a) => ["fatal", "critical", "serious"].includes(a.severity))
            .filter((a) => a.verified || a.upvoteCount > 0)
            .sort((a, b) => {
              const sevWeight = (s: string) => s === "fatal" ? 3 : s === "critical" ? 2 : 1;
              if (sevWeight(b.severity) !== sevWeight(a.severity)) {
                return sevWeight(b.severity) - sevWeight(a.severity);
              }
              if (b.upvoteCount !== a.upvoteCount) return b.upvoteCount - a.upvoteCount;
              return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
            })
            .slice(0, 10);

          if (!list.length) {
            return (
              <div style={{
                background: "linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)",
                color: "#fff",
                padding: 24,
                borderRadius: 16,
                marginBottom: 24,
                textAlign: "center",
              }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🌤️</div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>No serious incidents in this window</div>
                <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>
                  Either no fatal/critical/serious reports have been verified yet,
                  or the time filter is hiding them. Try &ldquo;All Hours&rdquo;.
                </div>
              </div>
            );
          }

          return (
            <div style={{
              background: "#fff",
              border: "1px solid #E2E8F0",
              borderRadius: 16,
              padding: 20,
              marginBottom: 24,
              borderTop: "4px solid #DC2626",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <span style={{
                  display: "inline-block",
                  width: 10, height: 10, borderRadius: "50%",
                  background: "#DC2626",
                  boxShadow: "0 0 0 4px rgba(220,38,38,0.18)",
                }} />
                <h3 style={{ margin: 0, fontFamily: '"Hubot Sans","Nunito","Quicksand",system-ui,sans-serif', fontSize: 18, fontWeight: 800 }}>
                  Serious Incidents
                </h3>
                <span style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>
                  {list.length} of {hourFiltered.filter((a) => ["fatal","critical","serious"].includes(a.severity)).length} shown
                </span>
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                {list.map((a) => {
                  const sevColor = sevColors[a.severity] || "#DC2626";
                  return (
                    <div key={a.id} style={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr auto",
                      alignItems: "center",
                      gap: 12,
                      padding: 12,
                      borderRadius: 12,
                      background: "#F8FAFC",
                      border: "1px solid #E2E8F0",
                    }}>
                      <span style={{
                        display: "inline-block",
                        width: 12, height: 12, borderRadius: "50%",
                        background: sevColor,
                        flexShrink: 0,
                      }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: sevColor, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                            {a.severity}
                          </span>
                          {a.verified && (
                            <span style={{ fontSize: 10, fontWeight: 700, background: "#DCFCE7", color: "#166534", padding: "2px 6px", borderRadius: 999 }}>
                              ✓ Verified
                            </span>
                          )}
                          {a.fatalities > 0 && (
                            <span style={{ fontSize: 10, fontWeight: 700, background: "#FEE2E2", color: "#991B1B", padding: "2px 6px", borderRadius: 999 }}>
                              {a.fatalities} fatality{a.fatalities !== 1 ? "ies" : ""}
                            </span>
                          )}
                          {a.casualties > 0 && (
                            <span style={{ fontSize: 10, fontWeight: 700, background: "#FEF3C7", color: "#92400E", padding: "2px 6px", borderRadius: 999 }}>
                              {a.casualties} injured
                            </span>
                          )}
                          {(() => {
                            const { mood } = splitMood(a.description);
                            if (!mood) return null;
                            const mm = MOOD_META[mood];
                            return (
                              <span title="How the reporter said it felt" style={{ fontSize: 10, fontWeight: 700, background: `${mm.color}1A`, color: mm.color, padding: "2px 6px", borderRadius: 999 }}>
                                {mm.emoji} {mm.label}
                              </span>
                            );
                          })()}
                        </div>
                        <div style={{ fontSize: 13, color: "#0F172A", fontWeight: 600, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {a.junctionName || "(unnamed junction)"}{a.district ? `, ${a.district}` : ""}
                        </div>
<div style={{ fontSize: 11, color: "#0F172A", marginTop: 2, background: "rgba(255,255,255,0.75)", padding: "4px 8px", borderRadius: 10, boxShadow: "0 1px 2px rgba(15,23,42,0.06)", border: "1px solid rgba(226,232,240,0.9)" }}>
                          {new Date(a.occurredAt).toLocaleString()}
                          {(() => {
                            const { text } = splitMood(a.description);
                            return text ? ` • ${text.slice(0, 80)}${text.length > 80 ? "…" : ""}` : "";
                          })()}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: "#DC2626", lineHeight: 1 }}>
                          {a.upvoteCount}
                        </div>
                        <div style={{ fontSize: 10, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 2 }}>
                          applaud{a.upvoteCount !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Charts */}
        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
            {/* Severity */}
            <div style={{ background: "#fff", padding: 20, borderRadius: 16, border: "1px solid #E2E8F0" }}>
              <h3 style={{ margin: "0 0 16px", fontFamily: '"Hubot Sans","Nunito","Quicksand",system-ui,sans-serif', fontSize: 16, fontWeight: 600 }}>Severity Distribution</h3>
              {Object.entries(stats.severity).map(([sev, count]) => (
                <div key={sev} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#475569", marginBottom: 2 }}>
                    <span>{sev.charAt(0).toUpperCase() + sev.slice(1)}</span>
                    <span style={{ fontWeight: 700 }}>{count}</span>
                  </div>
                  <div style={{ height: 8, background: "#E2E8F0", borderRadius: 999 }}>
                    <div style={{ width: `${(count / stats.total) * 100}%`, height: "100%", background: sevColors[sev] || "#3B82F6", borderRadius: 999 }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Vehicle Types */}
            <div style={{ background: "#fff", padding: 20, borderRadius: 16, border: "1px solid #E2E8F0" }}>
              <h3 style={{ margin: "0 0 16px", fontFamily: '"Hubot Sans","Nunito","Quicksand",system-ui,sans-serif', fontSize: 16, fontWeight: 600 }}>Vehicle Types</h3>
              {Object.entries(stats.vehicles).map(([v, count]) => (
                <div key={v} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#475569", marginBottom: 2 }}>
                    <span>{v}</span>
                    <span style={{ fontWeight: 700 }}>{count}</span>
                  </div>
                  <div style={{ height: 8, background: "#E2E8F0", borderRadius: 999 }}>
                    <div style={{ width: `${(count / stats.total) * 100}%`, height: "100%", background: "#A855F7", borderRadius: 999 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}