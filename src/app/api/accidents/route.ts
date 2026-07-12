// GET /api/accidents
// Lists accidents from Supabase REST. Optional ?status=pending|verified|rejected filter.

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
