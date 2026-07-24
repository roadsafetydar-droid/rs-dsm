"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet.markercluster";

if (typeof window !== "undefined") {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  document.head.appendChild(link);
  const clusterCss = document.createElement("link");
  clusterCss.rel = "stylesheet";
  clusterCss.href = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css";
  document.head.appendChild(clusterCss);
  const clusterDefCss = document.createElement("link");
  clusterDefCss.rel = "stylesheet";
  clusterDefCss.href = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css";
  document.head.appendChild(clusterDefCss);
}

interface Accident {
  id: number;
  lat: number;
  lng: number;
  severity: string;
  vehicleTypes: string[];
  district: string;
  ward: string;
  junctionName: string;
  occurredAt: string;
  casualties: number;
  fatalities: number;
  injuries: number;
  verified: boolean;
  upvoteCount: number;
  intensity: number;
  photoUrl?: string;
  description?: string;
  weather?: string;
  roadCondition?: string;
}

interface DashboardMapProps {
  accidents: Accident[];
  selectedHour: string;
  seriousMode: boolean;
}

const SEV_COLORS: Record<string, string> = {
  fatal: "#DC2626",
  critical: "#FBBF24",
  serious: "#3B82F6",
  minor: "#22C55E",
};
const SEV_ORDER = ["fatal", "critical", "serious", "minor"];

function getSeverityColor(severity: string): string {
  return SEV_COLORS[severity] || "#3B82F6";
}

function SeverityIcon(severity: string) {
  const color = getSeverityColor(severity);
  return L.divIcon({
    className: "custom-marker-icon",
    html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

export default function DashboardMap({ accidents, selectedHour, seriousMode }: DashboardMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterWard, setFilterWard] = useState("");
  const [filterDistrict, setFilterDistrict] = useState("");
  const [filteredCount, setFilteredCount] = useState(0);

  const wards = [...new Set(accidents.map(a => a.ward).filter(Boolean))].sort();
  const districts = [...new Set(accidents.map(a => a.district).filter(Boolean))].sort();
  const years = [...new Set(accidents.map(a => new Date(a.occurredAt).getFullYear().toString()).filter(Boolean))].sort();
  const months = ["01","02","03","04","05","06","07","08","09","10","11","12"];

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    try {
      const map = L.map(mapRef.current, {
        zoomControl: true,
        attributionControl: true,
        center: [-6.7924, 39.2083],
        zoom: 11,
        zoomSnap: 0.5,
        wheelPxPerZoomLevel: 120,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const clusterGroup = L.markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
      });
      map.addLayer(clusterGroup);
      clusterGroupRef.current = clusterGroup;
      mapInstanceRef.current = map;

      const doInvalidate = () => { try { map.invalidateSize(); } catch {} };
      setTimeout(doInvalidate, 100);
      setTimeout(doInvalidate, 300);
      setTimeout(doInvalidate, 600);
      const onResize = () => doInvalidate();
      window.addEventListener("resize", onResize);
      (map as any)._rsdCleanup = () => window.removeEventListener("resize", onResize);
    } catch (e) {
      console.error("[DashboardMap] init error:", e);
    }
    return () => {
      if (mapInstanceRef.current) {
        const cleanup = (mapInstanceRef.current as any)._rsdCleanup;
        if (cleanup) cleanup();
        (mapInstanceRef.current as any).remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const clusterGroup = clusterGroupRef.current;
    if (!map || !clusterGroup) return;

    clusterGroup.clearLayers();

    let filtered = accidents;

    if (selectedHour !== "all") {
      filtered = filtered.filter(a => new Date(a.occurredAt).getHours() === parseInt(selectedHour));
    }

    if (seriousMode) {
      filtered = filtered
        .filter(a => ["fatal", "critical", "serious"].includes(a.severity))
        .filter(a => a.verified || a.upvoteCount > 0);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        (a.junctionName && a.junctionName.toLowerCase().includes(q)) ||
        (a.district && a.district.toLowerCase().includes(q)) ||
        (a.ward && a.ward.toLowerCase().includes(q)) ||
        (a.description && a.description.toLowerCase().includes(q))
      );
    }
    if (filterDate) {
      filtered = filtered.filter(a => a.occurredAt.startsWith(filterDate));
    }
    if (filterMonth) {
      filtered = filtered.filter(a => a.occurredAt.startsWith(`-${filterMonth}-`) || a.occurredAt.includes(`-${filterMonth}-`));
      filtered = filtered.filter(a => a.occurredAt.includes(`-${filterMonth}-`));
    }
    if (filterYear) {
      filtered = filtered.filter(a => a.occurredAt.startsWith(filterYear));
    }
    if (filterSeverity !== "all") {
      filtered = filtered.filter(a => a.severity === filterSeverity);
    }
    if (filterWard) {
      filtered = filtered.filter(a => a.ward === filterWard);
    }
    if (filterDistrict) {
      filtered = filtered.filter(a => a.district === filterDistrict);
    }

    setFilteredCount(filtered.length);

    filtered.forEach(a => {
      const sevColor = getSeverityColor(a.severity);
      const desc = a.description || "";
      const moodMatch = /^\[mood:(sad|tragic|hopeful|miraculous)\]\s*/i.exec(desc);
      const cleanDesc = moodMatch ? desc.slice(moodMatch[0].length) : desc;

      const html = `
        <div style="min-width:240px;font-family:system-ui,sans-serif;">
          ${a.photoUrl ? `<img src="${a.photoUrl}" alt="Photo" style="width:100%;max-height:150px;object-fit:cover;border-radius:8px;margin-bottom:8px;">` : ""}
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${sevColor};"></span>
            <strong style="font-size:15px;text-transform:capitalize;">${a.severity}</strong>
            <span style="margin-left:auto;font-size:11px;color:#94A3B8;">#${a.id}</span>
          </div>
          <div style="font-size:12px;color:#475569;margin-bottom:4px;">
            <strong>${a.junctionName || "Unknown"}</strong>${a.district ? `, ${a.district}` : ""}${a.ward ? ` / ${a.ward}` : ""}
          </div>
          <div style="font-size:11px;color:#64748B;margin-bottom:6px;">
            ${new Date(a.occurredAt).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
            ${a.fatalities > 0 ? `<span style="font-size:11px;background:#FEE2E2;color:#991B1B;padding:2px 8px;border-radius:999;">${a.fatalities} fatal</span>` : ""}
            ${a.casualties > 0 ? `<span style="font-size:11px;background:#FEF3C7;color:#92400E;padding:2px 8px;border-radius:999;">${a.casualties} injured</span>` : ""}
            ${Array.isArray(a.vehicleTypes) && a.vehicleTypes.length > 0 ? `<span style="font-size:11px;background:#EFF6FF;color:#1E40AF;padding:2px 8px;border-radius:999;">${a.vehicleTypes.join(", ")}</span>` : ""}
            ${a.weather ? `<span style="font-size:11px;background:#F0F9FF;color:#0C4A6E;padding:2px 8px;border-radius:999;">${a.weather}</span>` : ""}
          </div>
          ${cleanDesc ? `<div style="font-size:12px;color:#475569;margin-top:4px;border-top:1px solid #E2E8F0;padding-top:4px;">${cleanDesc}</div>` : ""}
        </div>`;

      const marker = L.marker([a.lat, a.lng], { icon: SeverityIcon(a.severity) });
      marker.bindPopup(html);
      clusterGroup.addLayer(marker);
    });

    // Heat layer from CDN
    try {
      const HeatLayer = (window as any).L?.heatLayer;
      if (HeatLayer && filtered.length > 5) {
        const points = filtered
          .map(a => {
            const lat = Number(a.lat);
            const lng = Number(a.lng);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
            const weight = a.severity === "fatal" ? 3 : a.severity === "critical" ? 2.5 : a.severity === "serious" ? 2 : 1;
            return [lat, lng, weight] as [number, number, number];
          })
          .filter(Boolean) as [number, number, number][];
        if (points.length > 0) {
          HeatLayer(points, {
            radius: 25, blur: 15, maxZoom: 10, max: 4,
            gradient: { 0.2: "#22C55E", 0.4: "#FBBF24", 0.6: "#F87171", 0.8: "#DC2626", 1: "#7F1D1D" },
          }).addTo(map);
        }
      }
    } catch {}
  }, [accidents, selectedHour, seriousMode, searchQuery, filterDate, filterMonth, filterYear, filterSeverity, filterWard, filterDistrict]);

  const selectStyle: React.CSSProperties = {
    padding: "6px 10px", border: "1px solid #E2E8F0", borderRadius: 8,
    fontSize: 12, minHeight: 36, background: "#fff", color: "#0F172A",
  };

  return (
    <div>
      <div style={{
        display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap",
        padding: "12px 16px", background: "#fff", borderRadius: 12,
        border: "1px solid #E2E8F0", alignItems: "center",
      }}>
        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search location..." style={{
            ...selectStyle, flex: 1, minWidth: 160,
          }} />
        <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)} style={selectStyle}>
          <option value="all">All Severity</option>
          {SEV_ORDER.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select value={filterDistrict} onChange={e => setFilterDistrict(e.target.value)} style={selectStyle}>
          <option value="">All Districts</option>
          {districts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={filterWard} onChange={e => setFilterWard(e.target.value)} style={selectStyle}>
          <option value="">All Wards</option>
          {wards.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
        <select value={filterYear} onChange={e => setFilterYear(e.target.value)} style={selectStyle}>
          <option value="">All Years</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={selectStyle}>
          <option value="">All Months</option>
          {months.map(m => <option key={m} value={m}>{new Date(2020, parseInt(m)-1).toLocaleString('en', { month: 'short' })}</option>)}
        </select>
        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
          style={selectStyle} />
        <span style={{ fontSize: 11, color: "#64748B", whiteSpace: "nowrap" }}>
          {filteredCount} marker{filteredCount !== 1 ? "s" : ""}
        </span>
      </div>
      <div
        ref={mapRef}
        style={{
          width: "100%", height: "500px", minHeight: "400px",
          borderRadius: 16, overflow: "hidden", marginBottom: 24,
          border: "1px solid #E2E8F0", position: "relative", zIndex: 1,
          background: "#E8EDF2",
        }}
      />
    </div>
  );
}
