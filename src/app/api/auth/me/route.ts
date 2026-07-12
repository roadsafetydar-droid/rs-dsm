// GET /api/auth/me
// Returns the current Supabase user + the linked UserProfile role + User flags.
//
// IMPORTANT: Uses @supabase/ssr createServerClient to read session cookies.
// The service-role client (getSupabaseAdmin) does NOT read cookies and
// would return { user: null } for browser requests, breaking the editor
// page permission check for Google OAuth users.

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Hardcoded admin emails that bypass DB lookup. */
const ADMIN_EMAILS = ["roadsafetydar@gmail.com"];

export async function GET(request: NextRequest) {
  try {
    // Read session from cookies — NOT the service role client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const sb = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll() { /* read-only */ },
      },
    });

    const {
      data: { user },
    } = await sb.auth.getUser();

    if (!user) {
      return NextResponse.json({ user: null });
    }

    const admin = getSupabaseAdmin();
    const userEmail = user.email?.toLowerCase() ?? "";

    // Check if this is a hardcoded admin
    if (ADMIN_EMAILS.includes(userEmail)) {
      // Return admin flags even if no DB record exists
      return NextResponse.json({
        supabaseUser: {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.email,
          avatar: user.user_metadata?.avatar_url || null,
        },
        role: "admin",
        dbUser: {
          id: 0,
          username: userEmail.split("@")[0],
          email: userEmail,
          isStaff: true,
          isSuperuser: true,
        },
      });
    }

    // Try to find a UserProfile linked to this Supabase UID
    const { data: profile } = await admin
      .from("UserProfile")
      .select("userId, role, user:User(id, username, email, isStaff, isSuperuser)")
      .eq("supabaseUid", user.id)
      .maybeSingle();

    let dbUser: any = (profile as any)?.user ?? null;
    let role = (profile as any)?.role ?? "community";

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
        role = dbUser.isSuperuser ? "admin" : "community";
        await admin.from("UserProfile").upsert(
          {
            userId: dbUser.id,
            role,
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
      role,
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
