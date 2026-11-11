import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionUser, homeFor } from "@/lib/auth/dal";
import { SignupForm } from "./signup-form";
import { GoogleButton } from "../google-button";

export const metadata = { title: "Create an account · Chartwise" };

export default async function SignupPage() {
  const user = await getSessionUser();
  if (user) redirect(homeFor(user));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <SignupForm />
        <div className="flex items-center gap-3 text-[12px] text-muted">
          <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
        </div>
        <GoogleButton />
        <p className="text-center text-[13px] text-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-accent underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
