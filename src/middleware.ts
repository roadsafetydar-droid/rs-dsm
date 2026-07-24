import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const runtime = "nodejs";

const ROUTE_GUARDS = [
  { path: "/dashboard", allowedRoles: ["ADMIN", "TRAFFIC_POLICE", "TANROADS", "admin", "police", "tanroads"], redirect: "/login" },
  { path: "/editor", allowedRoles: ["ADMIN", "TRAFFIC_POLICE", "admin", "police"], redirect: "/dashboard" },
  { path: "/authority", allowedRoles: ["ADMIN", "TRAFFIC_POLICE", "TANROADS", "admin", "police", "tanroads"], redirect: "/dashboard" },
  { path: "/profile", allowedRoles: ["ADMIN", "TRAFFIC_POLICE", "TANROADS", "admin", "police", "tanroads"], redirect: "/login" },
];

const ALL_ROLES = ["ADMIN", "TRAFFIC_POLICE", "TANROADS", "admin", "police", "tanroads", "community"];

function normalizeRole(role: string): string {
  const map: Record<string, string> = {
    admin: "ADMIN", police: "TRAFFIC_POLICE", tanroads: "TANROADS", community: "community",
  };
  return map[role] || role;
}

async function getUserRoleFromSession(request: NextRequest): Promise<string | null> {
  if (!supabaseUrl || !supabaseKey) return null;
  try {
    const { createServerClient } = await import("@supabase/ssr");
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: { getAll() { return request.cookies.getAll(); }, setAll() { /* read-only */ } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { createClient } = await import("@supabase/supabase-js");
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;
    if (serviceKey) {
      const adminAuth = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
      try {
        const { data: adminData } = await adminAuth.auth.admin.getUserById(user.id);
        if (adminData?.user?.app_metadata?.role) {
          const appRole = normalizeRole(adminData.user.app_metadata.role as string);
          if (ALL_ROLES.includes(appRole)) return appRole;
        }
      } catch {}
    }

    const appRole = user.app_metadata?.role as string | undefined;
    if (appRole && ALL_ROLES.includes(appRole)) return normalizeRole(appRole);

    const admin = getSupabaseAdmin();
    const { data: profile } = await admin.from("UserProfile").select("role").eq("supabaseUid", user.id).maybeSingle();
    if (profile) return normalizeRole((profile as any).role);

    if (user.email) {
      const { data: userMatch } = await admin.from("User").select("id, isStaff, isSuperuser").eq("email", user.email).maybeSingle();
      if (userMatch) {
        if ((userMatch as any).isSuperuser) return "ADMIN";
        if ((userMatch as any).isStaff) return "TRAFFIC_POLICE";
      }
    }
    return "community";
  } catch { return null; }
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const guard = ROUTE_GUARDS.find((g) => path.startsWith(g.path));
  if (!supabaseUrl || !supabaseKey) return NextResponse.next({ request });

  const { createServerClient } = await import("@supabase/ssr");
  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: { getAll() { return request.cookies.getAll(); }, setAll(cookiesToSet) { cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value)); supabaseResponse = NextResponse.next({ request }); cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options)); } },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (guard && !user) { const url = request.nextUrl.clone(); url.pathname = "/login"; return NextResponse.redirect(url); }
  if (guard && user) {
    const role = await getUserRoleFromSession(request);
    if (!role || !guard.allowedRoles.includes(role)) { const url = request.nextUrl.clone(); url.pathname = guard.redirect; return NextResponse.redirect(url); }
  }
  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)"],
};
