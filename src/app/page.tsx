import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getSessionUser, homeFor } from "@/lib/auth/session";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/brand";

// Placeholder until the landing page and pricing are built.
export default async function Home() {
  const user = await getSessionUser();

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="m-0 text-3xl font-semibold tracking-tight">{PRODUCT_NAME}</h1>
      <p className="m-0 max-w-md text-muted">{PRODUCT_TAGLINE}</p>
      <div className="flex gap-3">
        {user ? (
          <Button asChild>
            <Link href={homeFor(user.role)}>Continue</Link>
          </Button>
        ) : (
          <>
            <Button asChild>
              <Link href="/signup">Create account</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/login">Log in</Link>
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
