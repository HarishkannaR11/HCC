import type { Metadata } from "next";
import Link from "next/link";
import { GoogleButton } from "@/components/auth/google-button";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { safeNextPath } from "@/lib/auth/redirects";

export const metadata: Metadata = { title: "Log in" };

const ERRORS: Record<string, string> = {
  google: "Google sign-in is not available right now. Use your email and password.",
  callback: "That sign-in link did not work. Try again.",
  confirm: "That confirmation link is invalid or has expired.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNextPath(params.next, "") || undefined;
  const error = typeof params.error === "string" ? ERRORS[params.error] : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log in</CardTitle>
        <CardDescription>Pick up where you left off.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <GoogleButton next={next} />
        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
        </div>
        <LoginForm next={next} initialError={error} />
        <p className="m-0 text-center text-[13px] text-muted">
          New here?{" "}
          <Link href="/signup" className="text-accent-ink">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
