// POST /api/accidents/[id]/verify
// Editor/admin approves or rejects a pending accident.
// Uses Supabase REST (service role) — Prisma not required.

import { NextRequest, NextResponse } from "next/server";
import { createClient, getSupabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const accidentId = Number(id);
    if (!Number.isFinite(accidentId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    // 1. Auth via cookie-bound client (reads the user's session)
    const supabaseUser = createClient();
    const {
      data: { user },
    } = await supabaseUser.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized — please sign in." },
        { status: 401 }
      );
    }

    // 2. Check staff status via User table
    const sb = getSupabaseAdmin();
    const { data: dbUser, error: userErr } = await sb
      .from("User")
      .select("id, email, isStaff, isSuperuser, profile: UserProfile(role)")
      .eq("email", user.email ?? "")
      .maybeSingle();

    if (userErr) {
      console.error("[verify] user lookup error:", userErr.message);
      return NextResponse.json(
        { error: "Failed to verify permissions." },
        { status: 500 }
      );
    }

    const role = (dbUser as any)?.profile?.role ?? "community";
    const isStaff =
      (dbUser as any)?.isStaff === true ||
      (dbUser as any)?.isSuperuser === true ||
      role === "editor" ||
      role === "admin";

    if (!isStaff) {
      return NextResponse.json(
        { error: "Forbidden — staff access required." },
        { status: 403 }
      );
    }

    // 3. Apply the verification
    if (body.status === "verified") {
      const { error: updErr } = await sb
        .from("Accident")
        .update({
          verificationStatus: "verified",
          verified: true,
          verifiedAt: new Date().toISOString(),
        })
        .eq("id", accidentId);

      if (updErr) {
        return NextResponse.json(
          { error: "Failed to verify", detail: updErr.message },
          { status: 500 }
        );
      }

      // Best-effort audit log
      await sb.from("AuditLog").insert({
        accidentId,
        userId: (dbUser as any)?.id ?? null,
        action: "verified",
        description: "Verified by editor",
      });
    } else if (body.status === "rejected") {
      const { error: updErr } = await sb
        .from("Accident")
        .update({
          verificationStatus: "rejected",
          verified: false,
          verifiedAt: new Date().toISOString(),
          rejectionReason: body.reason || "",
        })
        .eq("id", accidentId);

      if (updErr) {
        return NextResponse.json(
          { error: "Failed to reject", detail: updErr.message },
          { status: 500 }
        );
      }

      await sb.from("AuditLog").insert({
        accidentId,
        userId: (dbUser as any)?.id ?? null,
        action: "rejected",
        description: body.reason || "Rejected by editor",
      });
    } else {
      return NextResponse.json(
        { error: "status must be 'verified' or 'rejected'" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[verify] error:", err);
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
