import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { getSessionUser, homeFor, safeNextPath } from "@/lib/auth/dal";
import { LoginForm } from "./login-form";
import { GoogleButton } from "../google-button";

export const metadata = { title: "Sign in · Chartwise" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNextPath(params.next) ?? undefined;

  const user = await getSessionUser();
  if (user) redirect(next ?? homeFor(user));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {params.error ? (
          <Alert variant="destructive">
            {params.error === "google"
              ? "Google sign-in is not available right now. Use email and password."
              : "That sign-in link is invalid or has expired. Sign in again."}
          </Alert>
        ) : null}
        <LoginForm next={next} />
        <div className="flex items-center gap-3 text-[12px] text-muted">
          <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
        </div>
        <GoogleButton next={next} />
        <p className="text-center text-[13px] text-muted">
          New here?{" "}
          <Link href="/signup" className="text-accent underline-offset-4 hover:underline">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
