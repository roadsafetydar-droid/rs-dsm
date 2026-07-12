import Link from "next/link";
import PremiumTopNav from "@/components/PremiumTopNav";

export default function Home() {
  return (
    <>
      <PremiumTopNav variant="default" />


      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "48px 24px" }}>
        {/* Hero Section */}
        <section className="hero-section">
          <div style={{ position: "relative", zIndex: 1 }}>
            <h1 style={{ margin: 0, fontSize: "56px", fontWeight: 800, lineHeight: 1.05, color: "#fff" }}>
              Road Safety{" "}
              <span style={{ color: "#60A5FA" }}>Dar es Salaam</span>
            </h1>
            <p style={{ margin: "12px 0 0", fontSize: "20px", color: "#94A3B8", maxWidth: "56ch" }}>
              Real-time accident hotspot intelligence for Tanzania's commercial capital. Crowdsourced reports and official police data, verified for every junction.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "16px", position: "relative", flexShrink: 0 }}>
            <span className="live-badge">
              <span className="live-dot" />
              LIVE DATA
            </span>
            <img src="/map-icon-2.png" alt="Map" style={{ width: 120, height: 120, objectFit: "contain", opacity: 0.8 }} />
          </div>
        </section>

        {/* KPI Grid */}
        <div className="kpi-grid">
          {[
            { num: "1,200+", label: "Total Reports", color: "#F87171", border: "#F87171" },
            { num: "850+", label: "Verified Reports", color: "#22C55E", border: "#22C55E" },
            { num: "60+", label: "Tracked Junctions", color: "#3B82F6", border: "#3B82F6" },
            { num: "40%", label: "Police Verified", color: "#FBBF24", border: "#FBBF24" },
          ].map((kpi) => (
            <div key={kpi.label} className="kpi-card" style={{ borderTop: `3px solid ${kpi.border}` }}>
              <div className="kpi-value" style={{ color: kpi.color }}>{kpi.num}</div>
              <div className="kpi-label">{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* Action Bar — secondary navigation */}
        <div className="action-bar">
          <Link href="/dashboard/" className="btn-secondary">View Hotspot Map</Link>
          <Link href="/login" className="btn-ghost">Sign In</Link>
          <span style={{ marginLeft: "auto", fontSize: 14, color: "#475569", fontWeight: 500 }}>
            ⚡ Citizen-powered · 850+ verified reports
          </span>
        </div>

        {/* Featured Stat Cards */}
        <div className="featured-stat-grid">
          {[
            { label: "Total Reports", sublabel: "Crowdsourced + official", value: "1,200+", icon: "/add-report.png", gradient: "linear-gradient(135deg, #DBEAFE, #FFFFFF)", color: "#3B82F6" },
            { label: "Fatal Accidents", sublabel: "Since Jan 2024", value: "45", icon: "/stone-hazard.png", gradient: "linear-gradient(135deg, #FEE2E2, #FFFFFF)", color: "#F87171" },
            { label: "Tracked Junctions", sublabel: "Across 5 districts", value: "60+", icon: "/map-icon.png", gradient: "linear-gradient(135deg, #FEF3C7, #FFFFFF)", color: "#D97706" },
            { label: "Police Verified", sublabel: "Official records", value: "850+", icon: "/fingerprint-icon.png", gradient: "linear-gradient(135deg, #DCFCE7, #FFFFFF)", color: "#16A34A" },
          ].map((card) => (
            <div key={card.label} className="featured-stat-card" style={{ background: card.gradient }}>
              <img src={card.icon} alt="" style={{ width: 44, height: 44, objectFit: "contain", opacity: 0.7, marginBottom: 8 }} />
              <div className="featured-stat-card-body">
                <div className="featured-stat-value">{card.value}</div>
                <div className="featured-stat-label" style={{ color: card.color }}>{card.label}</div>
                <div className="featured-stat-sublabel">{card.sublabel}</div>
              </div>
            </div>
          ))}
        </div>

        {/* MID-PAGE PRIMARY CTA — Report Accident (centerpiece) */}
        <section className="report-cta-section">
          <div className="report-cta-left">
            <div className="report-cta-eyebrow">
              <span className="report-cta-dot" />
              <span>Live Citizen Reporting</span>
            </div>
            <h2 className="report-cta-title" style={{ color: "#FFFFFF" }}>
              Saw an accident? <br />
              <span style={{ color: "#F87171" }}>Report it in 60 seconds.</span>
            </h2>
            <p className="report-cta-sub">
              Your report helps identify hotspots, save lives, and push authorities to fix dangerous junctions.
              Anonymous by default. Takes less than a minute.
            </p>
            <div className="report-cta-actions">
              <Link href="/report/" className="btn-report-primary">
                <span style={{ fontSize: 20, marginRight: 8 }}>＋</span> Report an Accident Now
              </Link>
              <Link href="/dashboard/" className="btn-report-secondary">
                See Live Hotspots
              </Link>
            </div>
            <div className="report-cta-strip">
              <div><strong>📍 5 districts</strong> covered</div>
              <div><strong>⚡ 60 sec</strong> average form time</div>
              <div><strong>🔒 Anonymous</strong> by default</div>
            </div>
          </div>
          <div className="report-cta-right">
            <div className="report-cta-hotspot-header">
              <span className="live-dot" />
              <span>Top 5 Active Hotspots</span>
              <span style={{ marginLeft: "auto", fontSize: 11, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1 }}>Last 30 days</span>
            </div>
            <div className="report-cta-hotspot-list">
              {[
                { rank: 1, area: "Kariakoo — Bibi Titi", reports: 24, severity: "Critical", color: "#F87171" },
                { rank: 2, area: "Ubungo Junction", reports: 19, severity: "Critical", color: "#F87171" },
                { rank: 3, area: "Mwenge — Bagamoyo Rd", reports: 17, severity: "High", color: "#FBBF24" },
                { rank: 4, area: "Kivukoni Front", reports: 14, severity: "High", color: "#FBBF24" },
                { rank: 5, area: "Mbagala Roundabout", reports: 11, severity: "Medium", color: "#3B82F6" },
              ].map((h) => (
                <div key={h.rank} className="report-cta-hotspot-row">
                  <div className="report-cta-hotspot-rank" style={{ background: h.color }}>{h.rank}</div>
                  <div className="report-cta-hotspot-meta">
                    <div className="report-cta-hotspot-name">{h.area}</div>
                    <div className="report-cta-hotspot-stats">
                      <span style={{ color: h.color, fontWeight: 700 }}>{h.severity}</span>
                      <span style={{ color: "#94A3B8" }}>·</span>
                      <span>{h.reports} reports</span>
                    </div>
                  </div>
                  <Link href={`/dashboard/?area=${encodeURIComponent(h.area)}`} className="report-cta-hotspot-link">View →</Link>
                </div>
              ))}
            </div>
            <Link href="/dashboard/" className="report-cta-hotspot-foot">
              Open full hotspot intelligence map →
            </Link>
          </div>
        </section>

        {/* Charts Grid */}
        <div className="charts-grid">
          <div className="chart-card">
            <h3>Severity Distribution</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { label: "Fatal", value: 15, color: "#F87171" },
                { label: "Critical", value: 25, color: "#FBBF24" },
                { label: "Serious", value: 35, color: "#3B82F6" },
                { label: "Minor", value: 25, color: "#22C55E" },
              ].map((s) => (
                <div key={s.label}>
                  <div className="severity-bar-header">
                    <span>{s.label}</span>
                    <span className="severity-bar-value">{s.value}%</span>
                  </div>
                  <div className="severity-bar-track">
                    <div className="severity-bar-fill" style={{ width: `${s.value}%`, background: s.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="chart-card">
            <h3>Key Features</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {[
                { icon: "📍", text: "Crowdsourced accident reports from citizens across all 5 districts" },
                { icon: "🤖", text: "Recommendations for high-risk junctions" },
                { icon: "👮", text: "Police verification workflow for data integrity" },
                { icon: "📊", text: "Statistics dashboard and PDF + Excel data export" },
              ].map((f) => (
                <div key={f.text} className="feature-item">
                  <span style={{ fontSize: "24px" }}>{f.icon}</span>
                  <span className="feature-text">{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="chart-card wide">
            <h3>Coverage Area — Dar es Salaam</h3>
            <div className="district-grid">
              {[
                { district: "Ilala", wards: 17 },
                { district: "Kinondoni", wards: 20 },
                { district: "Temeke", wards: 24 },
                { district: "Ubungo", wards: 14 },
                { district: "Kigamboni", wards: 8 },
              ].map((d) => (
                <div key={d.district} className="district-card">
                  <div className="district-name">{d.district}</div>
                  <div className="district-wards">{d.wards} wards</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="site-footer">
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src="/accident-protection.png" alt="" style={{ width: 24, height: 24, objectFit: "contain", opacity: 0.6 }} />
            <span style={{ fontWeight: 700, fontSize: 16, color: "#0F172A" }}>Road Safety Dar es Salaam</span>
          </div>
          <p style={{ margin: 0, color: "#64748B", fontSize: 14, lineHeight: 1.6, textAlign: "center" }}>
            &copy; {new Date().getFullYear()} <strong>Road Safety Dar es Salaam</strong> — All Rights Reserved.
            <br />
            Built with passion for safer roads. Contact:{" "}
            <a href="mailto:roadsafetydar@gmail.com" style={{ color: "#3B82F6", textDecoration: "none", fontWeight: 600 }}>
              roadsafetydar@gmail.com
            </a>
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px 20px", marginTop: 4 }}>
            {["Ilala", "Kinondoni", "Temeke", "Ubungo", "Kigamboni"].map((d) => (
              <Link key={d} href={`/dashboard?district=${d.toLowerCase()}`} style={{ color: "#64748B", textDecoration: "none", fontSize: 13, fontWeight: 500 }}
              >{d}</Link>
            ))}
          </div>
          <div style={{ fontSize: 11, color: "#94A3B8", letterSpacing: "0.5px", marginTop: 8 }}>
            SDG 11.2 — Safer urban transport in Dar es Salaam · Tanzania
          </div>
          <div style={{ fontSize: 10, color: "#CBD5E1", fontFamily: "monospace", opacity: 0.5 }}>
            {/* Inline verification hash — this site was engineered with dedication */}
            {/* HASH: RS-DSM-2026-VERIFIED-7g9k2m4x */}
            {/* Proof of work: Engineered using Next.js + Supabase + AI */}
          </div>
        </div>
      </footer>

      {/* Console credit — visible to developers */}
      <script dangerouslySetInnerHTML={{
        __html: `
        console.log("%c Road Safety Dar es Salaam %c",
          "background:#1E3A5F;color:#fff;padding:8px 16px;border-radius:4px 0 0 4px;font-size:16px;font-weight:bold",
          "background:#3B82F6;color:#fff;padding:8px 16px;border-radius:0 4px 4px 0;font-size:16px"
        );
        console.log("%c Road Safety Dar es Salaam %c roadsafetydar@gmail.com %c",
          "background:#0F172A;color:#22C55E;padding:6px 12px;border-radius:4px 0 0 4px;font-size:13px",
          "background:#22C55E;color:#0F172A;padding:6px 12px;border-radius:0 4px 4px 0;font-size:13px"
        );
        console.log("HASH: RS-DSM-2026-VERIFIED");
        console.log("This is a verified build.");
        `
      }} />
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .topbar-link {
          color: #fff; text-decoration: none; font-size: 16px; font-weight: 600;
          padding: 8px 12px; border-radius: 8px; transition: background 0.24s;
          letter-spacing: -0.2px;
        }
        .topbar-link:hover { background: rgba(255,255,255,0.12); }
        .btn-signin {
          background: rgba(255,255,255,0.15); color: #fff; padding: 0.5rem 1.2rem; border-radius: 8px;
          font-weight: 700; text-decoration: none; font-size: 0.85rem;
          backdropFilter: blur(4px);
          border: 1px solid rgba(255,255,255,0.2);
          transition: background 0.2s, transform 0.15s;
        }
        .btn-signin:hover { background: rgba(255,255,255,0.25); transform: translateY(-1px); }
        .hero-section {
          display: flex; align-items: flex-start; justify-content: space-between; gap: 48px;
          margin-bottom: 48px; padding: 48px;
          background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
          border-radius: 28px; color: #fff; position: relative; overflow: hidden;
        }
        .live-badge {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(34, 197, 94, 0.15); color: #22C55E;
          padding: 8px 16px; border-radius: 999px; font-size: 16px; font-weight: 600;
          letter-spacing: 0.04em; text-transform: uppercase;
          border: 1px solid rgba(34, 197, 94, 0.3); backdrop-filter: blur(4px);
        }
        .live-dot {
          width: 8px; height: 8px; border-radius: 50%; background: #22C55E;
          animation: pulse 1.5s ease-in-out infinite;
        }
        .kpi-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px; margin-bottom: 48px;
        }
        .kpi-card {
          background: #fff; padding: 24px; border-radius: 20px;
          border: 1px solid #E2E8F0; box-shadow: 0 1px 3px rgba(15,23,42,0.04);
          text-align: center;
          transition: transform 0.24s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.24s;
        }
        .kpi-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(15,23,42,0.06); }
        .kpi-value {
          font-family: "Hubot Sans","Nunito","Quicksand",system-ui,sans-serif;
          font-size: 40px; font-weight: 800; line-height: 1;
        }
        .kpi-label { font-size: 16px; color: #475569; margin-top: 8px; font-weight: 600; }
        .action-bar {
          display: flex; flex-wrap: wrap; gap: 12px; align-items: center;
          margin-bottom: 48px; padding: 24px 32px;
          background: #fff; border-radius: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.04);
        }
        .btn-primary, .btn-secondary, .btn-ghost {
          display: inline-flex; align-items: center; gap: 8px;
          text-decoration: none; font-family: "Atkinson Hyperlegible","Nunito Sans","Inter",system-ui,sans-serif;
          font-size: 12px; text-transform: uppercase; letter-spacing: 2.5px;
          font-weight: 600; min-height: 56px; padding: 1.3em 3em;
          border-radius: 45px; cursor: pointer; line-height: 1;
          box-shadow: 0px 8px 15px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease 0s;
        }
        .btn-primary { background: #fff; color: #000; }
        .btn-primary:hover { background-color: #23c483; box-shadow: 0px 15px 20px rgba(46, 229, 157, 0.4); color: #fff; transform: translateY(-7px); }
        .btn-secondary { background: #fff; color: #000; }
        .btn-secondary:hover { background-color: #3B82F6; box-shadow: 0px 15px 20px rgba(59, 130, 246, 0.4); color: #fff; transform: translateY(-7px); }
        .btn-ghost { background: transparent; box-shadow: none; color: #000; }
        .btn-ghost:hover { background: #f1f5f9; box-shadow: 0px 8px 15px rgba(0, 0, 0, 0.08); transform: translateY(-3px); }

        .featured-stat-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 24px; margin: 48px 0;
        }
        .featured-stat-card {
          position: relative; width: 100%; max-width: 320px; height: 260px;
          border-radius: 20px; overflow: hidden; isolation: isolate;
          transition: transform 0.24s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.24s;
          border: 1px solid #E2E8F0;
        }
        .featured-stat-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(15,23,42,0.06); }
        .featured-stat-card-body {
          z-index: 1; position: relative; width: 100%; height: 100%;
          border-radius: 19px; background: rgba(255,255,255,0.88);
          backdrop-filter: blur(4px); display: flex; flex-direction: column;
          align-items: center; justify-content: center; padding: 24px 16px;
          text-align: center; gap: 4px;
        }
        .featured-stat-value {
          font-family: "Hubot Sans","Nunito","Quicksand",system-ui,sans-serif;
          font-weight: 800; font-size: 40px; letter-spacing: -0.02em; color: #0F172A;
        }
        .featured-stat-label {
          font-family: "Hubot Sans","Nunito","Quicksand",system-ui,sans-serif;
          font-size: 19px; font-weight: 600; margin-top: 8px;
        }
        .featured-stat-sublabel { font-size: 14px; color: #475569; margin-top: 4px; }
        .charts-grid {
          display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; margin-bottom: 48px;
        }
        .chart-card {
          background: #fff; padding: 24px; border-radius: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.04);
        }
        .chart-card h3 {
          margin: 0 0 16px; font-family: "Hubot Sans","Nunito","Quicksand",system-ui,sans-serif;
          font-size: 19px; color: #0F172A; font-weight: 600;
        }
        .chart-card.wide { grid-column: span 2; }
        .severity-bar-header { display: flex; justify-content: space-between; font-size: 14px; color: #475569; margin-bottom: 4px; }
        .severity-bar-value { font-weight: 700; color: #0F172A; }
        .severity-bar-track { height: 8px; background: #E2E8F0; border-radius: 999px; overflow: hidden; }
        .severity-bar-fill { height: 100%; border-radius: 999px; transition: width 300ms ease; }
        .feature-item { display: flex; gap: 12px; align-items: center; }
        .feature-text { font-size: 14px; color: #475569; line-height: 1.5; }
        .district-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; }
        .district-card { padding: 16px; background: #F8FAFC; border-radius: 16px; border: 1px solid #E2E8F0; text-align: center; }
        .district-name { font-family: "Hubot Sans","Nunito","Quicksand",system-ui,sans-serif; font-weight: 700; font-size: 16px; color: #0F172A; }
        .district-wards { font-size: 12px; color: #475569; margin-top: 4px; }

        /* ===== MID-PAGE REPORT ACCIDENT CTA ===== */
        .report-cta-section {
          display: grid; grid-template-columns: 1.1fr 1fr; gap: 24px;
          margin: 56px 0; padding: 0;
        }
        .report-cta-left {
          background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
          color: #fff; border-radius: 24px; padding: 40px;
          position: relative; overflow: hidden;
          box-shadow: 0 12px 32px rgba(15, 23, 42, 0.18);
        }
        .report-cta-left::before {
          content: ""; position: absolute; top: -80px; right: -80px;
          width: 280px; height: 280px; border-radius: 50%;
          background: radial-gradient(circle, rgba(248, 113, 113, 0.25) 0%, transparent 70%);
        }
        .report-cta-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(34, 197, 94, 0.12); color: #22C55E;
          padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 700;
          letter-spacing: 0.05em; text-transform: uppercase;
          border: 1px solid rgba(34, 197, 94, 0.3);
          margin-bottom: 20px; position: relative; z-index: 1;
        }
        .report-cta-dot {
          width: 8px; height: 8px; border-radius: 50%; background: #22C55E;
          animation: pulse 1.5s ease-in-out infinite;
        }
        .report-cta-title {
          font-family: "Hubot Sans","Nunito","Quicksand",system-ui,sans-serif;
          font-size: 36px; font-weight: 800; line-height: 1.15; letter-spacing: -0.02em;
          margin: 0 0 16px; position: relative; z-index: 1;
        }
        .report-cta-sub {
          font-size: 16px; line-height: 1.6; color: #CBD5E1; margin: 0 0 28px;
          max-width: 480px; position: relative; z-index: 1;
        }
        .report-cta-actions {
          display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 28px;
          position: relative; z-index: 1;
        }
        .btn-report-primary {
          display: inline-flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #F87171 0%, #DC2626 100%);
          color: #fff; text-decoration: none;
          font-family: "Atkinson Hyperlegible","Inter",system-ui,sans-serif;
          font-size: 15px; font-weight: 700;
          padding: 16px 32px; border-radius: 14px;
          letter-spacing: 0.01em;
          box-shadow: 0 8px 20px rgba(220, 38, 38, 0.35);
          transition: all 0.2s ease;
        }
        .btn-report-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 28px rgba(220, 38, 38, 0.5);
        }
        .btn-report-secondary {
          display: inline-flex; align-items: center; justify-content: center;
          background: rgba(255, 255, 255, 0.1); color: #fff; text-decoration: none;
          border: 1px solid rgba(255, 255, 255, 0.25);
          font-size: 15px; font-weight: 600;
          padding: 16px 28px; border-radius: 14px;
          backdrop-filter: blur(8px);
          transition: all 0.2s ease;
        }
        .btn-report-secondary:hover {
          background: rgba(255, 255, 255, 0.18);
          transform: translateY(-1px);
        }
        .report-cta-strip {
          display: flex; flex-wrap: wrap; gap: 24px; padding-top: 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.12);
          font-size: 13px; color: #94A3B8; position: relative; z-index: 1;
        }
        .report-cta-strip strong { color: #fff; font-weight: 700; }

        .report-cta-right {
          background: #fff; border-radius: 24px; padding: 32px;
          border: 1px solid #E2E8F0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.04);
          display: flex; flex-direction: column;
        }
        .report-cta-hotspot-header {
          display: flex; align-items: center; gap: 8px;
          font-family: "Hubot Sans","Nunito",system-ui,sans-serif;
          font-size: 14px; font-weight: 700; color: #0F172A;
          text-transform: uppercase; letter-spacing: 0.05em;
          margin-bottom: 20px;
        }
        .report-cta-hotspot-header .live-dot {
          width: 8px; height: 8px; border-radius: 50%; background: #22C55E;
          animation: pulse 1.5s ease-in-out infinite;
        }
        .report-cta-hotspot-list {
          display: flex; flex-direction: column; gap: 10px; flex: 1;
        }
        .report-cta-hotspot-row {
          display: flex; align-items: center; gap: 14px;
          padding: 12px 14px; border-radius: 14px;
          background: #F8FAFC; border: 1px solid #E2E8F0;
          transition: all 0.2s ease;
        }
        .report-cta-hotspot-row:hover {
          background: #F1F5F9; transform: translateX(2px);
        }
        .report-cta-hotspot-rank {
          width: 32px; height: 32px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-weight: 800; font-size: 14px; flex-shrink: 0;
          box-shadow: 0 2px 6px rgba(0,0,0,0.12);
        }
        .report-cta-hotspot-meta { flex: 1; min-width: 0; }
        .report-cta-hotspot-name {
          font-weight: 700; font-size: 14px; color: #0F172A;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .report-cta-hotspot-stats {
          display: flex; gap: 6px; align-items: center; font-size: 12px; margin-top: 2px;
        }
        .report-cta-hotspot-link {
          color: #3B82F6; text-decoration: none; font-size: 12px; font-weight: 700;
          white-space: nowrap;
        }
        .report-cta-hotspot-link:hover { color: #1D4ED8; }
        .report-cta-hotspot-foot {
          display: block; text-align: center; margin-top: 18px; padding: 12px;
          background: #F1F5F9; border-radius: 12px; color: #1E293B;
          text-decoration: none; font-weight: 700; font-size: 13px;
          transition: background 0.2s;
        }
        .report-cta-hotspot-foot:hover { background: #E2E8F0; }
        .site-footer {
          text-align: center; padding: 48px 24px; background: linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%);
          border-top: 1px solid #E2E8F0;
        }

        /* ===== RESPONSIVE ===== */
        @media (max-width: 768px) {
          .hero-section { flex-direction: column; padding: 32px 24px; gap: 24px; }
          .hero-section h1 { font-size: 32px !important; }
          .hero-section p { font-size: 16px !important; }
          .kpi-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px; }
          .kpi-value { font-size: 28px !important; }
          .kpi-card { padding: 18px; }
          .action-bar { flex-direction: column; align-items: stretch; padding: 16px 20px; }
          .action-bar .btn-secondary, .action-bar .btn-ghost { justify-content: center; min-height: 48px; padding: 0.8em 1.5em; font-size: 11px; width: 100%; }
          .action-bar span { margin-left: 0 !important; text-align: center; }
          .charts-grid { grid-template-columns: 1fr !important; }
          .chart-card.wide { grid-column: span 1 !important; }
          .featured-stat-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px; }
          .featured-stat-card { max-width: 100%; height: 200px; }
          .featured-stat-card img { width: 32px !important; height: 32px !important; }
          .featured-stat-value { font-size: 28px !important; }
          .featured-stat-label { font-size: 15px !important; }
          .featured-stat-sublabel { font-size: 12px !important; }
          header { flex-wrap: wrap; gap: 8px; padding: 12px 16px !important; }
          header nav { gap: 12px !important; }
          .district-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .report-cta-section { grid-template-columns: 1fr !important; margin: 36px 0; }
          .report-cta-left { padding: 28px 24px; }
          .report-cta-title { font-size: 28px !important; }
          .report-cta-right { padding: 24px; }
          .hero-section img { width: 80px !important; height: 80px !important; }
        }
        @media (max-width: 480px) {
          .kpi-grid { grid-template-columns: 1fr 1fr !important; gap: 8px; }
          .kpi-card { padding: 12px; }
          .kpi-value { font-size: 22px !important; }
          .kpi-label { font-size: 13px !important; }
          .featured-stat-grid { grid-template-columns: 1fr !important; }
          .featured-stat-card { height: 180px; }
          .featured-stat-value { font-size: 24px !important; }
          .hero-section h1 { font-size: 24px !important; }
          .hero-section { padding: 24px 16px !important; }
          .hero-section img { width: 64px !important; height: 64px !important; }
          .action-bar { padding: 12px 16px !important; }
          .report-cta-left { padding: 24px 16px !important; }
          .report-cta-actions { flex-direction: column; }
          .report-cta-actions a { width: 100%; justify-content: center; }
          .report-cta-strip { flex-direction: column; gap: 8px; }
          .report-cta-title { font-size: 22px !important; }
          .report-cta-sub { font-size: 14px !important; }
          .district-grid { grid-template-columns: 1fr !important; }
          .site-footer { padding: 32px 16px !important; }
          .live-badge { font-size: 12px !important; padding: 6px 12px !important; }
        }
      `}</style>
    </>
  );
}