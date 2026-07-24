import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AccidentRow = {
  id: number;
  severity: string;
  vehicleTypes: string;
  occurredAt: string;
  fatalities: number;
  casualties: number;
  injuries: number;
  verified: boolean;
  verificationStatus: string;
  district: string;
  ward: string;
  junctionName: string;
  weather: string;
  roadCondition: string;
  lat: number;
  lng: number;
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function predictNextMonth(data: { month: string; count: number }[]): number {
  if (data.length < 3) return 0;
  const recent = data.slice(-6);
  const n = recent.length;
  const xMean = (n - 1) / 2;
  const yMean = recent.reduce((s, d) => s + d.count, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (recent[i].count - yMean);
    den += (i - xMean) ** 2;
  }
  const slope = den !== 0 ? num / den : 0;
  const intercept = yMean - slope * xMean;
  return Math.max(0, Math.round(slope * n + intercept));
}

export async function GET() {
  const start = Date.now();
  const sb = getSupabaseAdmin();

  const { data: rows, error } = await sb
    .from("Accident")
    .select(
      "id, severity, vehicleTypes, occurredAt, fatalities, casualties, injuries, verified, verificationStatus, district, ward, junctionName, weather, roadCondition, lat, lng"
    )
    .limit(2000);

  if (error) {
    return NextResponse.json({
      error: "Upstream database error",
      detail: error.message,
      total: 0, pending: 0, fatal: 0, serious: 0, minor: 0, critical: 0, verified: 0,
      totalFatalities: 0, totalCasualties: 0, junctionCount: 0,
      severity: {}, vehicles: {}, monthly: [], hourly: [],
      weekly: [], daily: [], byDistrict: [], byWeather: [], byRoadType: [],
      hotspots: [], prediction: 0, timeOfDay: [],
      _meta: { source: "supabase-failed", latencyMs: Date.now() - start },
    }, { status: 503 });
  }

  const accidents = (rows ?? []) as AccidentRow[];

  // Core aggregates
  const total = accidents.length;
  const severity: Record<string, number> = {};
  const vehicles: Record<string, number> = {};
  const monthly: Record<string, number> = {};
  const hourly: number[] = Array(24).fill(0);
  const weekly: Record<string, number> = {};
  const daily: Record<string, number> = {};
  const byDistrict: Record<string, number> = {};
  const byWeather: Record<string, number> = {};
  const byRoadType: Record<string, number> = {};
  const byJunction: Record<string, { count: number; fatal: number; severity: string }> = {};
  const timeOfDay = { morning: 0, afternoon: 0, evening: 0, night: 0 };

  let fatalities = 0, casualties = 0, injuries = 0, verified = 0, pending = 0;

  for (const a of accidents) {
    severity[a.severity] = (severity[a.severity] || 0) + 1;
    fatalities += a.fatalities ?? 0;
    casualties += a.casualties ?? 0;
    injuries += a.injuries ?? 0;
    if (a.verified) verified++;
    if (a.verificationStatus === "pending") pending++;

    try {
      const vtypes: string[] = JSON.parse(a.vehicleTypes || "[]");
      for (const v of vtypes) vehicles[v] = (vehicles[v] || 0) + 1;
    } catch {}

    const d = new Date(a.occurredAt);
    if (!isNaN(d.getTime())) {
      const monthKey = d.toISOString().slice(0, 7);
      monthly[monthKey] = (monthly[monthKey] || 0) + 1;
      hourly[d.getUTCHours()]++;

      const dayKey = d.toISOString().slice(0, 10);
      daily[dayKey] = (daily[dayKey] || 0) + 1;

      const dow = d.getUTCDay();
      const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
      weekly[dayNames[dow]] = (weekly[dayNames[dow]] || 0) + 1;

      const h = d.getUTCHours();
      if (h >= 5 && h < 12) timeOfDay.morning++;
      else if (h >= 12 && h < 17) timeOfDay.afternoon++;
      else if (h >= 17 && h < 21) timeOfDay.evening++;
      else timeOfDay.night++;
    }

    if (a.district) byDistrict[a.district] = (byDistrict[a.district] || 0) + 1;
    if (a.weather) byWeather[a.weather.toLowerCase()] = (byWeather[a.weather.toLowerCase()] || 0) + 1;
    if (a.roadCondition) byRoadType[a.roadCondition.toLowerCase()] = (byRoadType[a.roadCondition.toLowerCase()] || 0) + 1;

    if (a.junctionName) {
      const j = a.junctionName;
      if (!byJunction[j]) byJunction[j] = { count: 0, fatal: 0, severity: "minor" };
      byJunction[j].count++;
      if (a.severity === "fatal") byJunction[j].fatal++;
      const sevOrder = ["minor","serious","critical","fatal"];
      if (sevOrder.indexOf(a.severity) > sevOrder.indexOf(byJunction[j].severity)) {
        byJunction[j].severity = a.severity;
      }
    }
  }

  const { count: junctionCount } = await sb
    .from("Junction")
    .select("id", { count: "exact", head: true });

  const monthlyArr = Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));

  // Current year monthly (Jan-Dec)
  const currentYear = new Date().getFullYear().toString();
  const currentYearMonthly = MONTHS.map((m, i) => {
    const key = `${currentYear}-${String(i + 1).padStart(2, "0")}`;
    return { month: m, count: monthly[key] || 0 };
  });

  // Annual (last 5 years)
  const annualMap: Record<string, number> = {};
  monthlyArr.forEach(m => {
    const y = m.month.split("-")[0];
    annualMap[y] = (annualMap[y] || 0) + m.count;
  });
  const currentYearNum = parseInt(currentYear);
  const annualArr = Array.from({ length: 5 }, (_, i) => {
    const y = (currentYearNum - 4 + i).toString();
    return { year: y, count: annualMap[y] || 0 };
  });

  // Top 10 hotspots
  const hotspots = Object.entries(byJunction)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Prediction
  const prediction = predictNextMonth(monthlyArr);

  return NextResponse.json({
    total,
    pending,
    fatal: severity.fatal || 0,
    serious: severity.serious || 0,
    minor: severity.minor || 0,
    critical: severity.critical || 0,
    verified,
    totalFatalities: fatalities,
    totalCasualties: casualties,
    totalInjuries: injuries,
    junctionCount: junctionCount ?? 0,
    severity,
    vehicles,
    monthly: monthlyArr,
    hourly: hourly.map((count, hour) => ({ hour, count })),
    weekly: Object.entries(weekly).map(([day, count]) => ({ day, count })),
    daily: Object.entries(daily).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count })),
    currentYearMonthly,
    annual: annualArr,
    byDistrict: Object.entries(byDistrict)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    byWeather: Object.entries(byWeather)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    byRoadType: Object.entries(byRoadType)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    hotspots,
    prediction,
    timeOfDay: Object.entries(timeOfDay).map(([period, count]) => ({ period, count })),
    _meta: {
      source: "supabase",
      latencyMs: Date.now() - start,
    },
  });
}
