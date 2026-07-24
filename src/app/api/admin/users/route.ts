import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAILS = ["roadsafetydar@gmail.com"];

function normalizeRole(role: string): string {
  const map: Record<string, string> = { admin: "ADMIN", police: "TRAFFIC_POLICE", tanroads: "TANROADS", community: "community" };
  return map[role] || role;
}

async function getAuthUser(request: NextRequest): Promise<{ user: any; error?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const sb = createServerClient(supabaseUrl, supabaseKey, { cookies: { getAll() { return request.cookies.getAll(); }, setAll() { /* read-only */ } } });
  const { data: { user }, error } = await sb.auth.getUser();
  if (error || !user) return { user: null, error: "Not authenticated" };
  return { user };
}

export async function GET(request: NextRequest) {
  try {
    const { user, error: authErr } = await getAuthUser(request);
    if (authErr || !user) return NextResponse.json({ error: authErr || "Unauthorized" }, { status: 401 });

    const admin = getSupabaseAdmin();
    const userEmail = user.email?.toLowerCase() ?? "";

    if (!ADMIN_EMAILS.includes(userEmail)) {
      const { data: dbUser } = await admin.from("User").select("id, isSuperuser").eq("email", user.email ?? "").maybeSingle();
      if (!(dbUser as any)?.isSuperuser) return NextResponse.json({ error: "Forbidden — superuser access required" }, { status: 403 });
    }

    const { data: users, error: uErr } = await admin
      .from("User")
      .select(`id, email, username, firstName, lastName, isStaff, isSuperuser, isActive, dateJoined, profile:UserProfile(role, phone, supabaseUid)`)
      .order("dateJoined", { ascending: false })
      .limit(200);

    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

    // Normalize roles and add status
    const normalized = (users ?? []).map((u: any) => ({
      ...u,
      profile: u.profile ? { ...u.profile, role: normalizeRole(u.profile.role || "community") } : null,
      status: u.isActive === false ? "disabled" : u.isActive === null ? "pending" : "active",
    }));

    return NextResponse.json({ users: normalized });
  } catch (err: any) {
    console.error("[api/admin/users] error:", err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error: authErr } = await getAuthUser(request);
    if (authErr || !user) return NextResponse.json({ error: authErr || "Unauthorized" }, { status: 401 });

    const admin = getSupabaseAdmin();
    const userEmail = user.email?.toLowerCase() ?? "";

    if (!ADMIN_EMAILS.includes(userEmail)) {
      const { data: dbUser } = await admin.from("User").select("id, isSuperuser").eq("email", user.email ?? "").maybeSingle();
      if (!(dbUser as any)?.isSuperuser) return NextResponse.json({ error: "Forbidden — superuser access required" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, action, role, isActive, organization } = body;

    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    if (action === "update_role") {
      if (!role) return NextResponse.json({ error: "role is required" }, { status: 400 });
      const dbRole = role === "ADMIN" ? "admin" : role === "TRAFFIC_POLICE" ? "police" : role === "TANROADS" ? "tanroads" : "community";
      const { error: upErr } = await admin.from("UserProfile").upsert({ userId, role: dbRole }, { onConflict: "userId" });
      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

      const isStaffFlag = dbRole === "police" || dbRole === "admin";
      await admin.from("User").update({ isStaff: isStaffFlag }).eq("id", userId);

      try {
        const { data: profileWithUid } = await admin.from("UserProfile").select("supabaseUid").eq("userId", userId).maybeSingle();
        if (profileWithUid?.supabaseUid) {
          const adminAuth = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
          await adminAuth.auth.admin.updateUserById(profileWithUid.supabaseUid, { app_metadata: { role: dbRole } });
        }
      } catch (metaErr) { console.warn("[admin/users] Failed to sync app_metadata:", metaErr); }
      return NextResponse.json({ success: true, message: `Role updated to ${role}` });
    }

    if (action === "update_status") {
      const updates: Record<string, any> = {};
      if (typeof isActive === "boolean") updates.isActive = isActive;
      if (Object.keys(updates).length === 0) return NextResponse.json({ error: "No flags to update" }, { status: 400 });
      const { error: upErr } = await admin.from("User").update(updates).eq("id", userId);
      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
      return NextResponse.json({ success: true, message: "Status updated" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("[api/admin/users] error:", err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
