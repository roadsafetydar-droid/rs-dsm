// POST /api/auth/register
// Creates a Supabase user, then mirrors them into the local User + UserProfile tables
// via PostgREST (HTTPS — works regardless of IPv4/IPv6). Returns the new user + session.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PASSWORD_MIN = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Dedicated client for signUp — separate from the admin client because
// calling auth.signUp() on a shared client would mutate its session state
// and break subsequent admin calls (PostgREST would see the user JWT and
// hit "row-level security policy" instead of using the service key).
function getAuthSignUpClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export async function POST(request: NextRequest) {
  const start = Date.now();

  try {
    const body = await request.json().catch(() => ({} as any));
    const { email, password, username, firstName, lastName, phone, role } = body || {};

    // ---------- validation ----------
    if (!email || !EMAIL_RE.test(String(email))) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }
    if (!password || String(password).length < PASSWORD_MIN) {
      return NextResponse.json(
        { error: `Password must be at least ${PASSWORD_MIN} characters.` },
        { status: 400 }
      );
    }
    if (!firstName || String(firstName).trim().length < 1) {
      return NextResponse.json(
        { error: "First name is required." },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanFirst = String(firstName).trim();
    const cleanLast = String(lastName || "").trim();
    const cleanPhone = phone ? String(phone).trim() : null;
    // Auto-generate a username from the email local-part if the client
    // didn't provide one (legacy UI only collects first/last name + email).
    const emailLocal = cleanEmail.split("@")[0] || "user";
    const requestedUsername = (username ? String(username).trim() : "") || emailLocal;
    if (requestedUsername.length < 3) {
      return NextResponse.json(
        { error: "Could not derive a valid username from email. Please provide one (min 3 chars)." },
        { status: 400 }
      );
    }
    const requestedRole = role === "editor" ? "editor" : "community";

    // ---------- 1) Create Supabase auth user ----------
    const sbServer = getAuthSignUpClient();
    const { data: signUp, error: signErr } = await sbServer.auth.signUp({
      email: cleanEmail,
      password: String(password),
      options: {
        data: {
          username: requestedUsername,
          first_name: cleanFirst,
          last_name: cleanLast,
          phone: cleanPhone,
        },
      },
    });

    if (signErr || !signUp?.user) {
      console.error("[register] signUp failed:", signErr?.message);
      return NextResponse.json(
        { error: signErr?.message || "Could not create account" },
        { status: 400 }
      );
    }

    const supabaseUserId = signUp.user.id;
    const admin = getSupabaseAdmin();

    // ---------- 2) Mirror into User table ----------
    // Username uniqueness check (case-sensitive). If the auto-generated
    // local-part already exists, append a numeric suffix.
    let cleanUsername = requestedUsername;
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: existingUsername } = await admin
        .from("User")
        .select("id")
        .eq("username", cleanUsername)
        .maybeSingle();
      if (!existingUsername) break;
      cleanUsername = `${requestedUsername}${Math.floor(Math.random() * 9000) + 1000}`;
    }

    const { data: newUser, error: userErr } = await admin
      .from("User")
      .insert({
        email: cleanEmail,
        username: cleanUsername,
        firstName: cleanFirst,
        lastName: cleanLast,
        // Legacy Django-era column — Supabase Auth handles real passwords,
        // but the column is NOT NULL on the User table. We store a marker
        // (not the real hash) so this row is never the source of auth.
        password: "!supabase-managed",
        isStaff: false,
        isSuperuser: false,
        isActive: true,
        dateJoined: new Date().toISOString(),
      })
      .select("id, email, username, firstName, lastName")
      .single();

    if (userErr || !newUser) {
      console.error("[register] User insert failed:", userErr?.message);
      return NextResponse.json(
        { error: "Failed to save user record.", detail: userErr?.message },
        { status: 500 }
      );
    }

    // ---------- 3) Create UserProfile linked to Supabase UID ----------
    // UserProfile schema requires phone + role; we synthesize a placeholder
    // phone if the caller didn't provide one. phone is NOT NULL in the DB.
    const now = new Date().toISOString();
    const profilePhone = cleanPhone || `+255000${String((newUser as any).id).padStart(6, "0")}`;
    const { error: profileErr } = await admin.from("UserProfile").insert({
      userId: (newUser as any).id,
      role: requestedRole,
      phone: profilePhone,
      updatedAt: now,
      createdAt: now,
    });

    if (profileErr) {
      console.warn("[register] UserProfile insert warning:", profileErr.message);
      // Not fatal — auth user is created
    }

    return NextResponse.json(
      {
        ok: true,
        user: {
          id: (newUser as any).id,
          email: cleanEmail,
          username: requestedUsername,
          firstName: cleanFirst,
          lastName: cleanLast,
          role: requestedRole,
          isStaff: false,
          isSuperuser: false,
        },
        session: signUp.session
          ? {
              accessToken: signUp.session.access_token,
              refreshToken: signUp.session.refresh_token,
            }
          : null,
        _meta: { latencyMs: Date.now() - start },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[register] error:", err);
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
