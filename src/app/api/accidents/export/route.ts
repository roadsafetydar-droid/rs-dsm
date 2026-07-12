// GET /api/accidents/export
// Returns a filtered slice of accidents for client-side PDF/Excel export.
// Caps at 5,000 records; sets `truncated: true` if more would have matched.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { ExportResponse } from "@/lib/export/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CAP = 5000;
const VALID_SEVERITY = new Set(["minor", "serious", "critical", "fatal"]);
const VALID_VEHICLE = new Set([
  "motorcycle",
  "car",
  "bus",
  "truck",
  "bicycle",
  "pedestrian",
]);
const VALID_STATUS = new Set(["pending", "verified", "rejected", "all"]);

function parseDate(s: string | null): Date | null {
  if (!s) return null;
  // Accept YYYY-MM-DD; if anything else slips through, attempt ISO.
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function parseList(s: string | null): string[] {
  if (!s) return [];
  return s
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");
  const district = searchParams.get("district") || undefined;
  const severities = parseList(searchParams.get("severity")).filter((s) =>
    VALID_SEVERITY.has(s)
  );
  const vehicles = parseList(searchParams.get("vehicle")).filter((v) =>
    VALID_VEHICLE.has(v)
  );
  const statusRaw = (searchParams.get("status") || "all").toLowerCase();
  const status = VALID_STATUS.has(statusRaw) ? statusRaw : "all";

  const fromDate = parseDate(fromStr);
  const toDate = parseDate(toStr);
  if ((fromStr && !fromDate) || (toStr && !toDate)) {
    return NextResponse.json(
      { error: "Invalid date. Use YYYY-MM-DD." },
      { status: 400 }
    );
  }

  const where: Prisma.AccidentWhereInput = {};
  if (fromDate || toDate) {
    where.occurredAt = {};
    if (fromDate) where.occurredAt.gte = fromDate;
    if (toDate) {
      // Inclusive end-of-day
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      where.occurredAt.lte = end;
    }
  }
  if (district) where.district = district;
  if (severities.length) where.severity = { in: severities };
  if (status !== "all") where.verificationStatus = status;
  // Note: vehicleTypes is a JSON string — filtered client-side after fetch
  // to keep the Prisma where simple and the query plan safe.

  try {
    const [total, rows] = await Promise.all([
      prisma.accident.count({ where }),
      prisma.accident.findMany({
        where,
        orderBy: { occurredAt: "desc" },
        take: CAP,
        select: {
          id: true,
          lat: true,
          lng: true,
          district: true,
          ward: true,
          junctionName: true,
          occurredAt: true,
          reportedAt: true,
          severity: true,
          vehicleTypes: true,
          reporterType: true,
          casualties: true,
          fatalities: true,
          injuries: true,
          description: true,
          weather: true,
          roadCondition: true,
          contact: true,
          photoUrl: true,
          verificationStatus: true,
          verified: true,
          upvoteCount: true,
        },
      }),
    ]);

    // Filter by vehicle client-side (JSON column).
    let incidents = rows.map((a) => ({
      id: a.id,
      lat: a.lat,
      lng: a.lng,
      district: a.district,
      ward: a.ward,
      junctionName: a.junctionName,
      occurredAt: a.occurredAt.toISOString(),
      reportedAt: a.reportedAt.toISOString(),
      severity: a.severity,
      vehicleTypes: safeParseArray(a.vehicleTypes),
      reporterType: a.reporterType,
      casualties: a.casualties,
      fatalities: a.fatalities,
      injuries: a.injuries,
      description: a.description,
      weather: a.weather,
      roadCondition: a.roadCondition,
      contact: a.contact,
      photoUrl: a.photoUrl,
      verificationStatus: a.verificationStatus,
      verified: a.verified,
      upvoteCount: a.upvoteCount,
    }));

    if (vehicles.length) {
      incidents = incidents.filter((a) =>
        a.vehicleTypes.some((v) => vehicles.includes(v))
      );
    }

    const truncated = total > incidents.length;

    const body: ExportResponse = {
      filters: {
        from: fromStr || undefined,
        to: toStr || undefined,
        district,
        severity: severities as ExportResponse["filters"]["severity"],
        vehicle: vehicles as ExportResponse["filters"]["vehicle"],
        status: status as ExportResponse["filters"]["status"],
      },
      count: incidents.length,
      total,
      truncated,
      generatedAt: new Date().toISOString(),
      incidents,
    };

    return NextResponse.json(body);
  } catch (err) {
    console.error("[export] failed:", err);
    return NextResponse.json(
      { error: "Export query failed" },
      { status: 500 }
    );
  }
}

function safeParseArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((v) => String(v)) : [];
  } catch {
    return [];
  }
}
