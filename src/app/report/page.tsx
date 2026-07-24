"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface Ward { name: string; code: number; }
interface Street { id: number; street: string; places: string; }

interface DashboardStats {
  total: number; fatal: number; serious: number; minor: number;
  critical: number; verified: number; totalFatalities: number; totalCasualties: number;
  monthly?: { month: string; count: number }[];
}

const SIDEBAR_NAV = [
  { href: "/", label: "Home", icon: "◈" },
  { href: "/dashboard", label: "Dashboard", icon: "◉" },
  { href: "/report", label: "Report", icon: "◆" },
  { href: "/login", label: "Settings", icon: "⚙" },
];

const ACCENT = "#3B82F6";

export default function ReportPage() {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [districts, setDistricts] = useState<string[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [streets, setStreets] = useState<Street[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedWard, setSelectedWard] = useState("");
  const [selectedStreet, setSelectedStreet] = useState("");

  const [form, setForm] = useState({
    severity: "minor",
    vehicleType: "car",
    casualties: 0,
    fatalities: 0,
    injuries: 0,
    description: "",
    weather: "",
    roadCondition: "",
    contact: "",
    lat: 0,
    lng: 0,
    mood: "" as "" | "sad" | "tragic" | "hopeful" | "miraculous",
  });

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");

  useEffect(() => {
    fetch("/api/stats").then(r => r.json()).then(d => {
      if (d && !d.error) setStats(d);
    }).catch(() => {});
  }, []);

  const handlePhotoSelect = (file: File) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) { alert("Only JPEG, PNG, WebP, or GIF photos allowed."); return; }
    if (file.size > 5 * 1024 * 1024) { alert("Photo must be under 5 MB."); return; }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const uploadPhoto = async () => {
    if (!photoFile) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", photoFile);
      fd.append("upload_preset", "darroeadsafety");
      const res = await fetch("https://api.cloudinary.com/v1_1/roougsg4/image/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.secure_url) { setPhotoUrl(data.secure_url); setPhotoPreview(data.secure_url); }
      else { alert("Upload failed — try again"); }
    } catch { alert("Upload error — check your connection"); }
    setUploading(false);
  };

  const removePhoto = () => { setPhotoFile(null); setPhotoPreview(""); setPhotoUrl(""); };

  useEffect(() => {
    fetch("/api/locations").then((r) => r.json()).then((data) => setDistricts(data.map((d: any) => d.name)));
  }, []);

  useEffect(() => {
    if (!selectedDistrict) return;
    fetch(`/api/locations?district=${selectedDistrict}`).then((r) => r.json()).then((data) => setWards(data));
    setSelectedWard(""); setStreets([]);
  }, [selectedDistrict]);

  useEffect(() => {
    if (!selectedDistrict || !selectedWard) return;
    fetch(`/api/locations?district=${selectedDistrict}&ward=${selectedWard}`).then((r) => r.json()).then((data) => setStreets(data));
    setSelectedStreet("");
  }, [selectedDistrict, selectedWard]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => { setForm((f) => ({ ...f, lat: pos.coords.latitude, lng: pos.coords.longitude })); },
      () => {}
    );
  }, []);

  const getLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => { const lat = pos.coords.latitude; const lng = pos.coords.longitude; setForm((f) => ({ ...f, lat, lng })); },
      () => alert("Could not get location. Enable GPS on your device.")
    );
  };

  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    if (!selectedDistrict) { setErrorMsg("Please select a district."); setLoading(false); return; }
    if (!selectedWard) { setErrorMsg("Please select a ward."); setLoading(false); return; }
    const baseDescription = (form.description || "").trim();
    if (!baseDescription) { setErrorMsg("Please describe what happened."); setLoading(false); return; }
    const descriptionWithMood = form.mood ? `[mood:${form.mood}] ${baseDescription}`.trim() : baseDescription;
    const payload = { ...form, description: descriptionWithMood, photoUrl, occurredAt: new Date().toISOString(), district: selectedDistrict, ward: selectedWard, locationId: selectedStreet };
    try {
      const res = await fetch("/api/accidents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) setSubmitted(true);
      else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data?.detail || data?.error || "Failed to submit report");
      }
    } catch { setErrorMsg("Network error — please check your connection and try again."); }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div style={{ minHeight: "100vh", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ background: "#fff", padding: "clamp(24px, 6vw, 48px)", borderRadius: 28, textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", maxWidth: 400, width: "100%" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h2 style={{ margin: "0 0 8px", fontSize: "clamp(20px, 5vw, 24px)" }}>Report Submitted</h2>
          <p style={{ color: "#475569", marginBottom: 24, fontSize: 14 }}>Thank you for helping make Dar es Salaam safer.</p>
          <Link href="/dashboard" style={{ background: "#3B82F6", color: "#fff", padding: "12px 32px", borderRadius: 45, textDecoration: "none", fontWeight: 600, display: "inline-block" }}>
            View Map
          </Link>
        </div>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    padding: "12px 14px", border: "1px solid #E2E8F0", borderRadius: 10,
    fontSize: 16, minHeight: 48, outline: "none", width: "100%", boxSizing: "border-box",
    background: "#fff",
  };
  const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: "#334155" };
  const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 12 };

  const sidebarLinkStyle = (href: string): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 14px", borderRadius: 8,
    textDecoration: "none", fontSize: 14, fontWeight: 500,
    color: pathname === href || (href !== "/" && pathname?.startsWith(href)) ? "#fff" : "#94A3B8",
    background: pathname === href || (href !== "/" && pathname?.startsWith(href)) ? "rgba(59, 130, 246, 0.15)" : "transparent",
    transition: "all 0.15s",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", display: "flex" }}>
      <aside style={{
        width: 240, flexShrink: 0, background: "#0A0A0B",
        borderRight: "1px solid #1A1A1E", display: "flex", flexDirection: "column",
        position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 50,
        transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.25s ease",
      }} className="rsd-sidebar-desktop">
        <div style={{ padding: "16px 14px", borderBottom: "1px solid #1A1A1E" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <img src="/accident-protection.png" alt="" style={{ width: 28, height: 28 }} />
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 15, letterSpacing: "-0.02em" }}>
              Dar es Salaam <span style={{ color: ACCENT }}>Road Safety</span>
            </span>
          </Link>
        </div>
        <nav style={{ flex: 1, padding: "8px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {SIDEBAR_NAV.map((item) => (
            <Link key={item.href} href={item.href} style={sidebarLinkStyle(item.href)}>
              <span style={{ fontSize: 16, width: 20, textAlign: "center", opacity: 0.7 }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div style={{ padding: "12px 14px", borderTop: "1px solid #1A1A1E", fontSize: 11, color: "#475569" }}>
          v1.1.0-dev &middot; MIT
        </div>
      </aside>

      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 49 }} className="rsd-sidebar-mobile-overlay" />
      )}

      <div style={{ flex: 1, marginLeft: 0 }} className="rsd-main-content">
        <header style={{
          position: "sticky", top: 0, zIndex: 40,
          background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)",
          borderBottom: "1px solid #E2E8F0",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", maxWidth: 1400, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={() => setSidebarOpen(true)} className="rsd-sidebar-toggle"
                style={{ display: "none", background: "none", border: "none", padding: 6, cursor: "pointer", color: "#0F172A" }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M2.5 5h15M2.5 10h15M2.5 15h15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
              <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
                {["Report", "Insights", "Activity"].map((tab) => {
                  const active = tab === "Report";
                  return (
                    <span key={tab} style={{
                      padding: "6px 14px", borderRadius: 6, fontSize: 13, fontWeight: 600,
                      color: active ? "#0F172A" : "#64748B",
                      background: active ? "#F1F5F9" : "transparent",
                      cursor: "default",
                    }}>{tab}</span>
                  );
                })}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Link href="/login" style={{ fontSize: 13, fontWeight: 600, color: "#64748B", textDecoration: "none", padding: "6px 12px" }}>
                Sign In
              </Link>
              <Link href="/login?mode=register" style={{ fontSize: 13, fontWeight: 700, color: "#fff", background: ACCENT, textDecoration: "none", padding: "6px 14px", borderRadius: 8 }}>
                Register
              </Link>
            </div>
          </div>
        </header>

        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 20px" }}>
          {stats && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
              {[
                { label: "Total Reports", value: stats.total, color: "#3B82F6" },
                { label: "Verified", value: stats.verified, color: "#22C55E" },
                { label: "Fatal", value: stats.fatal, color: "#DC2626" },
                { label: "Critical", value: stats.critical, color: "#FBBF24" },
                { label: "Serious", value: stats.serious, color: "#A855F7" },
                { label: "Minor", value: stats.minor, color: "#94A3B8" },
              ].map((kpi) => (
                <div key={kpi.label} style={{ background: "#fff", padding: "14px 16px", borderRadius: 10, border: "1px solid #E2E8F0", borderTop: `3px solid ${kpi.color}`, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
                  <div style={{ fontFamily: '"Hubot Sans","Nunito","Quicksand",system-ui,sans-serif', fontSize: 26, fontWeight: 800, color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
                  <div style={{ fontSize: 12, color: "#64748B", fontWeight: 600, marginTop: 4 }}>{kpi.label}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20 }} className="rsd-report-layout">
            <div style={{ background: "#fff", padding: "clamp(20px, 4vw, 32px)", borderRadius: 12, border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>◆</div>
                <div>
                  <h2 style={{ margin: 0, fontSize: "clamp(18px, 4vw, 22px)", fontWeight: 700 }}>Report an Accident</h2>
                  <p style={{ color: "#64748B", margin: "2px 0 0", fontSize: 13 }}>Swahili or English &mdash; either is fine.</p>
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 28 }}>
                  <h4 style={sectionTitle}>📍 Location</h4>
                  <div className="rsd-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={labelStyle}>District</span>
                      <select value={selectedDistrict} onChange={(e) => setSelectedDistrict(e.target.value)} required style={inputStyle}>
                        <option value="">Select district</option>
                        {districts.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={labelStyle}>Ward</span>
                      <select value={selectedWard} onChange={(e) => setSelectedWard(e.target.value)} disabled={!selectedDistrict} required style={inputStyle}>
                        <option value="">Select ward</option>
                        {wards.map((w) => <option key={w.code} value={w.name}>{w.name}</option>)}
                      </select>
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: "span 2" }} className="rsd-full-mobile">
                      <span style={labelStyle}>Street / Location</span>
                      <select value={selectedStreet} onChange={(e) => setSelectedStreet(e.target.value)} disabled={!selectedWard} style={inputStyle}>
                        <option value="">Select street</option>
                        {streets.map((s) => <option key={s.id} value={s.street}>{s.street}{s.places ? ` (${s.places})` : ""}</option>)}
                      </select>
                    </label>
                  </div>
                  <button type="button" onClick={getLocation} className="rsd-location-btn" style={{ marginTop: 10, background: "none", border: "1px solid #E2E8F0", padding: "10px 18px", borderRadius: 10, cursor: "pointer", fontSize: 14, minHeight: 44 }}>
                    📍 Use my current location
                  </button>
                </div>

                <div style={{ marginBottom: 28 }}>
                  <h4 style={sectionTitle}>🚗 Incident Details</h4>
                  <div className="rsd-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={labelStyle}>Severity</span>
                      <select value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))} required style={inputStyle}>
                        <option value="minor">Minor (no casualties)</option>
                        <option value="serious">Serious (injury)</option>
                        <option value="fatal">Fatal (1+ deaths)</option>
                        <option value="critical">Critical (multiple)</option>
                      </select>
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={labelStyle}>Vehicle Type</span>
                      <select value={form.vehicleType} onChange={(e) => setForm((f) => ({ ...f, vehicleType: e.target.value }))} required style={inputStyle}>
                        <option value="motorcycle">Motorcycle / Bodaboda</option>
                        <option value="car">Car</option>
                        <option value="bus">Bus / Daladala</option>
                        <option value="truck">Truck / Lorry</option>
                        <option value="bicycle">Bicycle</option>
                        <option value="pedestrian">Pedestrian</option>
                      </select>
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={labelStyle}>Casualties</span>
                      <input type="number" min="0" value={form.casualties} onChange={(e) => setForm((f) => ({ ...f, casualties: parseInt(e.target.value) || 0 }))} style={inputStyle} />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={labelStyle}>Fatalities</span>
                      <input type="number" min="0" value={form.fatalities} onChange={(e) => setForm((f) => ({ ...f, fatalities: parseInt(e.target.value) || 0 }))} style={inputStyle} />
                    </label>
                  </div>
                </div>

                <div style={{ marginBottom: 28 }}>
                  <h4 style={sectionTitle}>📸 Photo Evidence (optional)</h4>
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handlePhotoSelect(f); }}
                    onClick={() => document.getElementById("fileInput")?.click()}
                    style={{ border: "2px dashed #CBD5E1", borderRadius: 16, padding: "clamp(16px, 4vw, 32px)", textAlign: "center", cursor: "pointer", background: photoPreview ? "#F0FDF4" : "#F8FAFC" }}
                  >
                    <input type="file" id="fileInput" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: "none" }}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoSelect(f); }} />
                    {photoPreview ? (
                      <div>
                        <img src={photoPreview} alt="Preview" style={{ maxHeight: 180, borderRadius: 12, marginBottom: 12, maxWidth: "100%", objectFit: "cover" }} />
                        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                          {!photoUrl && (
                            <button type="button" onClick={(e) => { e.stopPropagation(); uploadPhoto(); }} disabled={uploading}
                              style={{ background: "#3B82F6", color: "#fff", border: "none", padding: "8px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: uploading ? "not-allowed" : "pointer", minHeight: 44 }}>
                              {uploading ? "Uploading..." : "Upload Photo"}
                            </button>
                          )}
                          {photoUrl && <span style={{ color: "#22C55E", fontSize: 14, fontWeight: 600, padding: "8px 0" }}>✅ Photo uploaded</span>}
                          <button type="button" onClick={(e) => { e.stopPropagation(); removePhoto(); }}
                            style={{ background: "none", border: "1px solid #E2E8F0", padding: "8px 16px", borderRadius: 8, fontSize: 14, cursor: "pointer", minHeight: 44 }}>
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>📸</div>
                        <p style={{ margin: 0, fontSize: 14, color: "#475569" }}>Tap to browse or drag & drop a photo</p>
                        <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94A3B8" }}>JPEG, PNG, WebP, GIF &mdash; max 5 MB</p>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ marginBottom: 28 }}>
                  <h4 style={sectionTitle}>📝 Description</h4>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 8 }}>
                      How did it feel? <span style={{ fontSize: 12, fontWeight: 400, color: "#94A3B8" }}>(optional)</span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {([
                        { key: "sad", emoji: "😔", label: "Sad", color: "#3B82F6" },
                        { key: "tragic", emoji: "💔", label: "Tragic", color: "#DC2626" },
                        { key: "hopeful", emoji: "🤝", label: "Hopeful", color: "#22C55E" },
                        { key: "miraculous", emoji: "✨", label: "Miraculous", color: "#A855F7" },
                      ] as const).map((m) => {
                        const active = form.mood === m.key;
                        return (
                          <button key={m.key} type="button" onClick={() => setForm((f) => ({ ...f, mood: active ? "" : m.key }))}
                            aria-pressed={active}
                            style={{
                              display: "inline-flex", alignItems: "center", gap: 4,
                              padding: "8px 12px", minHeight: 40, borderRadius: 999,
                              border: `2px solid ${active ? m.color : "#E2E8F0"}`,
                              background: active ? `${m.color}15` : "#fff",
                              color: active ? m.color : "#475569",
                              fontSize: 13, fontWeight: 600, cursor: "pointer",
                            }}>
                            <span style={{ fontSize: 16 }}>{m.emoji}</span>
                            {m.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="What happened? (English or Swahili)" rows={3}
                    style={{ width: "100%", padding: "12px 14px", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 16, minHeight: 80, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }} />
                  <div className="rsd-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={labelStyle}>Weather</span>
                      <input value={form.weather} onChange={(e) => setForm((f) => ({ ...f, weather: e.target.value }))} placeholder="clear / rainy / drizzle" style={inputStyle} />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={labelStyle}>Road Condition</span>
                      <input value={form.roadCondition} onChange={(e) => setForm((f) => ({ ...f, roadCondition: e.target.value }))} placeholder="good / wet / potholed" style={inputStyle} />
                    </label>
                  </div>
                  <label style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 12 }}>
                    <span style={labelStyle}>Contact (optional)</span>
                    <input value={form.contact} onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))} placeholder="phone or email for follow-up" style={inputStyle} />
                  </label>
                </div>

                {errorMsg && (
                  <div style={{ background: "#FEF2F2", color: "#DC2626", padding: "12px 16px", borderRadius: 10, fontSize: 14, marginBottom: 12, border: "1px solid #FECACA" }}>
                    {errorMsg}
                  </div>
                )}
                <button type="submit" disabled={loading}
                  style={{ width: "100%", background: "#3B82F6", color: "#fff", border: "none", padding: "14px 16px", borderRadius: 999, fontSize: 16, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1, minHeight: 50 }}>
                  {loading ? "Submitting..." : "Submit Report"}
                </button>
              </form>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", overflow: "hidden", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
                <div style={{ padding: "14px 16px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14 }}>📋</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>Recent Activity</span>
                </div>
                <div style={{ padding: "12px 16px", maxHeight: 240, overflowY: "auto" }}>
                  {stats?.monthly && stats.monthly.length > 0 ? (
                    stats.monthly.slice(-6).reverse().map((item, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: i < Math.min(stats.monthly!.length, 6) - 1 ? "1px solid #F1F5F9" : "none" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: ACCENT, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: "#475569" }}>{item.month}: <strong>{item.count}</strong> reports</span>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: 12, color: "#94A3B8", textAlign: "center", padding: "12px 0" }}>Loading activity data...</div>
                  )}
                </div>
              </div>

              <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
                <div style={{ padding: "14px 16px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14 }}>📊</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>Severity Breakdown</span>
                </div>
                <div style={{ padding: "12px 16px" }}>
                  {stats ? (
                    [
                      { label: "Fatal", value: stats.fatal, color: "#DC2626", pct: stats.total > 0 ? (stats.fatal / stats.total * 100) : 0 },
                      { label: "Critical", value: stats.critical, color: "#FBBF24", pct: stats.total > 0 ? (stats.critical / stats.total * 100) : 0 },
                      { label: "Serious", value: stats.serious, color: "#A855F7", pct: stats.total > 0 ? (stats.serious / stats.total * 100) : 0 },
                      { label: "Minor", value: stats.minor, color: "#94A3B8", pct: stats.total > 0 ? (stats.minor / stats.total * 100) : 0 },
                    ].map((s) => (
                      <div key={s.label} style={{ marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#475569", marginBottom: 2 }}>
                          <span style={{ fontWeight: 600 }}>{s.label}</span>
                          <span>{s.value} ({s.pct.toFixed(0)}%)</span>
                        </div>
                        <div style={{ height: 6, background: "#F1F5F9", borderRadius: 999 }}>
                          <div style={{ width: `${s.pct}%`, height: "100%", background: s.color, borderRadius: 999 }} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: 12, color: "#94A3B8", textAlign: "center", padding: "12px 0" }}>Loading stats...</div>
                  )}
                </div>
              </div>

              <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
                <div style={{ padding: "14px 16px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14 }}>📈</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>Web Analytics</span>
                </div>
                <div style={{ padding: "12px 16px", fontSize: 12, color: "#64748B" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span>Total Reports</span>
                    <span style={{ fontWeight: 700, color: "#0F172A" }}>{stats?.total || 0}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span>Fatalities</span>
                    <span style={{ fontWeight: 700, color: "#DC2626" }}>{stats?.totalFatalities || 0}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Casualties</span>
                    <span style={{ fontWeight: 700, color: "#FBBF24" }}>{stats?.totalCasualties || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 640px) {
          .rsd-grid-2 { grid-template-columns: 1fr !important; }
          .rsd-full-mobile { grid-column: span 1 !important; }
          .rsd-location-btn { width: 100% !important; justify-content: center; }
        }
        @media (min-width: 821px) {
          .rsd-sidebar-desktop { transform: translateX(0) !important; }
          .rsd-main-content { margin-left: 240px !important; }
          .rsd-sidebar-toggle { display: none !important; }
        }
        @media (max-width: 820px) {
          .rsd-sidebar-toggle { display: inline-flex !important; }
          .rsd-sidebar-desktop { transform: translateX(-100%) !important; }
          .rsd-sidebar-desktop.open { transform: translateX(0) !important; }
        }
        @media (max-width: 900px) {
          .rsd-report-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}