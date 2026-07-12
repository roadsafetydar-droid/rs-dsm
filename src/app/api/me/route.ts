// GET /api/me
// Returns the current user's profile (role, isStaff, isSuperuser, firstName, etc).
// Uses Supabase REST for User + UserProfile lookups.

import { NextRequest, NextResponse } from "next/server";
import { createClient, getSupabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  try {
    const sb = createClient();
    const {
      data: { user },
    } = await sb.auth.getUser();

    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const admin = getSupabaseAdmin();

    // Lookup UserProfile by supabaseUid
    const { data: profile, error: pErr } = await admin
      .from("UserProfile")
      .select("userId, role, supabaseUid, user:User(id, email, firstName, lastName, isStaff, isSuperuser)")
      .eq("supabaseUid", user.id)
      .maybeSingle();

    if (pErr) {
      console.error("[api/me] profile lookup error:", pErr.message);
    }

    // Extract avatar from Supabase user metadata
    const avatarUrl: string | undefined =
      (user.user_metadata as any)?.avatar_url ||
      (user.user_metadata as any)?.picture ||
      undefined;

    if (!profile) {
      // Fallback: build a basic profile from Supabase user
      return NextResponse.json({
        user: {
          email: user.email,
          firstName: user.email?.split("@")[0] || "User",
          lastName: "",
          avatar: avatarUrl,
          role: "community",
          isStaff: false,
          isSuperuser: false,
        },
      });
    }

    const dbUser = (profile as any).user;
    return NextResponse.json({
      user: {
        email: dbUser?.email ?? user.email,
        firstName: dbUser?.firstName ?? (user.email?.split("@")[0] || "User"),
        lastName: dbUser?.lastName ?? "",
        avatar: avatarUrl,
        role: (profile as any).role ?? "community",
        isStaff: dbUser?.isStaff === true,
        isSuperuser: dbUser?.isSuperuser === true,
      },
    });
  } catch (err) {
    console.error("[api/me] error:", err);
    return NextResponse.json(
      { user: null, error: "Failed to load profile" },
      { status: 500 }
    );
  }
}
