// GET  /api/accidents           — list accidents (Supabase REST)
// POST /api/accidents           — public community report submission
//                                  (no auth required; contact required)
//
// Migrated from Prisma/PostgreSQL to Supabase PostgREST.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_STATUS = ["pending", "verified", "rejected"] as const;
type Status = (typeof ALLOWED_STATUS)[number];

const SEVERITY_WEIGHT: Record<string, number> = {
  minor: 1,
  serious: 2,
  critical: 3,
  fatal: 4,
};

const ALLOWED_SEVERITY = ["minor", "serious", "critical", "fatal"] as const;
const ALLOWED_VEHICLE = [
  "motorcycle",
  "car",
  "bus",
  "truck",
  "bicycle",
  "pedestrian",
] as const;

export async function GET(request: NextRequest) {
  const start = Date.now();
  const { searchParams } = new URL(request.url);
  const statusRaw = searchParams.get("status");
  const status: Status | null =
    statusRaw && (ALLOWED_STATUS as readonly string[]).includes(statusRaw)
      ? (statusRaw as Status)
      : null;

  const sb = getSupabaseAdmin();

  let query = sb
    .from("Accident")
    .select(
      "id, lat, lng, severity, vehicleTypes, district, junctionName, occurredAt, casualties, fatalities, verified, trustLevel, upvoteCount, verificationStatus, photoUrl, description"
    )
    .order("occurredAt", { ascending: false })
    .limit(1000);

  if (status) {
    query = query.eq("verificationStatus", status);
  }

  const { data: rows, error } = await query;

  if (error) {
    console.error("[api/accidents] supabase error:", error.message);
    return NextResponse.json(
      {
        error: "Upstream database error",
        detail: error.message,
        _meta: { source: "supabase-failed", latencyMs: Date.now() - start },
      },
      { status: 503 }
    );
  }

  const data = (rows ?? []).map((a: any) => {
    let vehicleTypes: string[] = [];
    try {
      vehicleTypes = JSON.parse(a.vehicleTypes || "[]");
    } catch {
      /* ignore */
    }
    return {
      ...a,
      vehicleTypes,
      intensity: SEVERITY_WEIGHT[a.severity] || 1,
      occurredAt:
        typeof a.occurredAt === "string"
          ? a.occurredAt
          : new Date(a.occurredAt).toISOString(),
    };
  });

  return NextResponse.json(data);
}

// POST /api/accidents
// Public community report. The form on /report already includes a `contact`
// field (phone or email) so we don't require an auth session.
export async function POST(request: NextRequest) {
  const start = Date.now();
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // ----- Validate -----
  const errors: string[] = [];

  const severity = String(body.severity ?? "").toLowerCase();
  if (!(ALLOWED_SEVERITY as readonly string[]).includes(severity)) {
    errors.push("severity must be one of: minor, serious, critical, fatal");
  }

  const vehicleType = String(body.vehicleType ?? "").toLowerCase();
  if (!(ALLOWED_VEHICLE as readonly string[]).includes(vehicleType)) {
    errors.push(
      "vehicleType must be one of: motorcycle, car, bus, truck, bicycle, pedestrian"
    );
  }

  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    errors.push("lat must be a number between -90 and 90");
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    errors.push("lng must be a number between -180 and 180");
  }

  const contact = String(body.contact ?? "").trim();
  if (!contact) {
    errors.push(
      "contact is required (phone or email so the community can be reached)"
    );
  } else {
    // Basic sanity: must look like a phone (>= 6 digits, optional +) or email
    const looksLikePhone = /^[+]?[\d\s\-()]{6,}$/.test(contact);
    const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
    if (!looksLikePhone && !looksLikeEmail) {
      errors.push("contact must be a valid phone number or email address");
    }
  }

  const casualties = Number(body.casualties ?? 0) || 0;
  const fatalities = Number(body.fatalities ?? 0) || 0;
  const injuries = Number(body.injuries ?? 0) || 0;

  const description = body.description ? String(body.description).trim() : null;
  // The form allows blank weather/roadCondition/photoUrl/contact; the DB columns
  // are NOT NULL, so substitute empty strings instead of NULL.
  const weather = body.weather ? String(body.weather).trim() : "";
  const roadCondition = body.roadCondition
    ? String(body.roadCondition).trim()
    : "";
  const district = body.district ? String(body.district).trim() : "";
  const ward = body.ward ? String(body.ward).trim() : "";
  // The DB column is NOT NULL but the report form has no real FK to a Location
  // table yet (it sends a street NAME string). Editors will assign the proper
  // Location row during verification. We send 0 as a sentinel for "pending
  // assignment" so the insert satisfies the NOT NULL constraint without
  // inventing a fake reference.
  const locationIdRaw = body.locationId
    ? Number(body.locationId)
    : NaN;
  const locationId = Number.isFinite(locationIdRaw) && locationIdRaw > 0
    ? locationIdRaw
    : 0;
  const photoUrl = body.photoUrl ? String(body.photoUrl).trim() : "";
  const occurredAt = body.occurredAt
    ? new Date(body.occurredAt).toISOString()
    : new Date().toISOString();

  if (errors.length) {
    return NextResponse.json(
      { error: "Validation failed", detail: errors.join("; ") },
      { status: 400 }
    );
  }

  // ----- Build row -----
  // trustLevel: community-submitted accidents start with a low default trust.
  // Editors raise it on verification.
  const insertRow: Record<string, any> = {
    lat,
    lng,
    severity,
    vehicleTypes: JSON.stringify([vehicleType]),
    casualties,
    fatalities,
    injuries,
    description,
    weather,
    roadCondition,
    contact,
    district,
    ward,
    locationId,
    photoUrl,
    occurredAt,
    reportedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    verificationStatus: "pending",
    verified: false,
    trustLevel: 0,
    upvoteCount: 0,
    reporterType: "community",
  };

  // ----- Insert -----
  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("Accident")
      .insert(insertRow)
      .select("id, verificationStatus")
      .single();

    if (error) {
      console.error("[api/accidents POST] supabase error:", error.message);
      return NextResponse.json(
        {
          error: "Failed to save report",
          detail: error.message,
          _meta: { latencyMs: Date.now() - start },
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        id: data.id,
        verificationStatus: data.verificationStatus,
        message:
          "Report received. An editor will review it before it appears on the public map.",
        _meta: { latencyMs: Date.now() - start },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[api/accidents POST] thrown:", err);
    return NextResponse.json(
      {
        error: "Unexpected server error",
        detail: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}
