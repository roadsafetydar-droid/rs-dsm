import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const runtime = "nodejs";

type RouteGuard = {
  path: string;
  allowedRoles: string[];
  redirect: string;
};

const ROUTE_GUARDS: RouteGuard[] = [
  { path: "/editor", allowedRoles: ["police", "tanroads"], redirect: "/dashboard" },
  { path: "/authority", allowedRoles: ["tanroads", "police"], redirect: "/dashboard" },
  { path: "/police", allowedRoles: ["police"], redirect: "/dashboard" },
  { path: "/researcher", allowedRoles: ["researcher"], redirect: "/dashboard" },
];

async function getUserRoleFromSession(request: NextRequest): Promise<string | null> {
  const guest = request.cookies.get("rsd_guest")?.value === "1";
  if (guest) return "guest";

  if (!supabaseUrl || !supabaseKey) return null;

  try {
    const { createServerClient } = await import("@supabase/ssr");
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll() { /* read-only */ },
      },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const admin = getSupabaseAdmin();
    const { data: profile } = await admin
      .from("UserProfile")
      .select("role")
      .eq("supabaseUid", user.id)
      .maybeSingle();

    if (profile) return (profile as any).role;

    if (user.email) {
      const { data: userMatch } = await admin
        .from("User")
        .select("id, isStaff, isSuperuser")
        .eq("email", user.email)
        .maybeSingle();
      if (userMatch) {
        if ((userMatch as any).isSuperuser) return "tanroads";
        if ((userMatch as any).isStaff) return "police";
      }
    }
    return "community";
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const commonProtected = ["/dashboard", "/profile"];
  const isCommonProtected = commonProtected.some((p) => path.startsWith(p));

  const guard = ROUTE_GUARDS.find((g) => path.startsWith(g.path));
  const isGuest = request.cookies.get("rsd_guest")?.value === "1";

  if (isCommonProtected && isGuest) {
    return NextResponse.next({ request });
  }

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({ request });
  }

  const { createServerClient } = await import("@supabase/ssr");
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  if ((isCommonProtected || guard) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (guard && user) {
    const role = await getUserRoleFromSession(request);
    if (!role || !guard.allowedRoles.includes(role)) {
      const url = request.nextUrl.clone();
      url.pathname = guard.redirect;
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)",
  ],
};
