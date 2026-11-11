import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/dal";

const OTP_TYPES: readonly EmailOtpType[] = ["signup", "email", "recovery", "invite", "magiclink", "email_change"];

/**
 * Email confirmation via token hash. Works when the link is opened in a
 * different browser from the one that signed up, which the PKCE code flow
 * does not. Requires the Supabase email template to link here (see README).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(searchParams.get("next")) ?? "/";

  if (searchParams.get("code")) {
    // Default template + PKCE: hand over to the code exchange.
    const callback = new URL("/auth/callback", origin);
    callback.search = searchParams.toString();
    return NextResponse.redirect(callback);
  }

  if (tokenHash && type && OTP_TYPES.includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  return NextResponse.redirect(new URL("/login?error=link", origin));
}
