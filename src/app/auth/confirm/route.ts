import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { safeNextPath } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";

const otpType = z.enum(["signup", "invite", "magiclink", "recovery", "email_change", "email"]);

/**
 * Email confirmation links. Accepts both shapes Supabase can send:
 *  - ?token_hash=&type=  (custom template; works on any device), and
 *  - ?code=              (default template with PKCE; same browser only).
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = safeNextPath(params.get("next"), "/");
  const supabase = await createClient();

  const tokenHash = params.get("token_hash");
  const type = otpType.safeParse(params.get("type"));
  if (tokenHash && type.success) {
    const { error } = await supabase.auth.verifyOtp({ type: type.data, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }

  const code = params.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }

  return NextResponse.redirect(new URL("/login?error=confirm", request.url));
}
