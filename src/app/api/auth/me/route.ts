// GET /api/auth/me
// Returns the current Supabase user + the linked UserProfile role + User flags.

import { NextResponse } from "next/server";
import { createClient, getSupabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sb = createClient();
    const {
      data: { user },
    } = await sb.auth.getUser();

    if (!user) {
      return NextResponse.json({ user: null });
    }

    const admin = getSupabaseAdmin();

    // Try to find a UserProfile linked to this Supabase UID
    const { data: profile } = await admin
      .from("UserProfile")
      .select("userId, role, user:User(id, username, email, isStaff, isSuperuser)")
      .eq("supabaseUid", user.id)
      .maybeSingle();

    let dbUser: any = (profile as any)?.user ?? null;

    // Fallback: try email match (for users created before profile link existed)
    if (!dbUser && user.email) {
      const { data: emailMatch } = await admin
        .from("User")
        .select("id, username, email, isStaff, isSuperuser")
        .eq("email", user.email)
        .maybeSingle();
      dbUser = emailMatch;

      // If matched by email, link the profile to this Supabase UID
      if (dbUser) {
        await admin.from("UserProfile").upsert(
          {
            userId: dbUser.id,
            role: dbUser.isSuperuser ? "admin" : "community",
            supabaseUid: user.id,
          },
          { onConflict: "userId" }
        );
      }
    }

    return NextResponse.json({
      supabaseUser: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email,
        avatar: user.user_metadata?.avatar_url || null,
      },
      role: (profile as any)?.role ?? "community",
      dbUser: dbUser
        ? {
            id: dbUser.id,
            username: dbUser.username,
            email: dbUser.email,
            isStaff: dbUser.isStaff === true,
            isSuperuser: dbUser.isSuperuser === true,
          }
        : null,
    });
  } catch (err) {
    console.error("[api/auth/me] error:", err);
    return NextResponse.json(
      { user: null, error: "Server error" },
      { status: 500 }
    );
  }
}
