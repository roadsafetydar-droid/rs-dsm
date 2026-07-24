import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAILS = ["roadsafetydar@gmail.com"];

function normalizeRole(role: string): string {
  const map: Record<string, string> = { admin: "ADMIN", police: "TRAFFIC_POLICE", tanroads: "TANROADS", community: "community" };
  return map[role] || role;
}

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const sb = createServerClient(supabaseUrl, supabaseKey, {
      cookies: { getAll() { return request.cookies.getAll(); }, setAll() { /* read-only */ } },
    });
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ user: null }, { status: 200 });

    const admin = getSupabaseAdmin();
    const avatarUrl = (user.user_metadata as any)?.avatar_url || (user.user_metadata as any)?.picture || undefined;

    // Try UserProfile by supabaseUid
    const { data: profile } = await admin
      .from("UserProfile")
      .select("userId, role, user:User(id, email, firstName, lastName, isStaff, isSuperuser, isActive)")
      .eq("supabaseUid", user.id)
      .maybeSingle();

    if (!profile && user.email) {
      // Fallback by email
      const { data: emailMatch } = await admin
        .from("User")
        .select("id, email, firstName, lastName, isStaff, isSuperuser, isActive")
        .eq("email", user.email)
        .maybeSingle();

      if (emailMatch) {
        const role = emailMatch.isSuperuser ? "ADMIN" : normalizeRole(emailMatch.isStaff ? "TRAFFIC_POLICE" : "community");
        await admin.from("UserProfile").upsert({ userId: emailMatch.id, role, supabaseUid: user.id }, { onConflict: "userId" }).maybeSingle();
        return NextResponse.json({
          user: {
            email: emailMatch.email,
            firstName: emailMatch.firstName || (user.email?.split("@")[0] || "User"),
            lastName: emailMatch.lastName || "",
            avatar: avatarUrl,
            role,
            isStaff: emailMatch.isStaff === true,
            isSuperuser: emailMatch.isSuperuser === true,
            status: emailMatch.isActive ? "active" : "disabled",
          },
        });
      }
    }

    if (profile) {
      const dbUser = (profile as any).user;
      const role = normalizeRole((profile as any).role || "community");
      const status = dbUser?.isActive === false ? "disabled" : "active";
      return NextResponse.json({
        user: {
          email: dbUser?.email ?? user.email,
          firstName: dbUser?.firstName ?? (user.email?.split("@")[0] || "User"),
          lastName: dbUser?.lastName ?? "",
          avatar: avatarUrl,
          role,
          isStaff: dbUser?.isStaff === true,
          isSuperuser: dbUser?.isSuperuser === true,
          status,
        },
      });
    }

    // Hardcoded admin fallback
    const isAdminEmail = user.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
    return NextResponse.json({
      user: {
        email: user.email,
        firstName: user.email?.split("@")[0] || "User",
        lastName: "",
        avatar: avatarUrl,
        role: isAdminEmail ? "ADMIN" : "community",
        isStaff: isAdminEmail ? true : false,
        isSuperuser: isAdminEmail ? true : false,
        status: "active",
      },
    });
  } catch (err) {
    console.error("[api/me] error:", err);
    return NextResponse.json({ user: null, error: "Failed to load profile" }, { status: 500 });
  }
}
