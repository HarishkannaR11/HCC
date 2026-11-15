import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { PRODUCT_NAME } from "@/lib/brand";
import type { SessionUser } from "@/lib/auth/session";

export function SiteHeader({ user }: { user: SessionUser }) {
  return (
    <header className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-1 bg-topbar px-4 py-2 text-bg sm:h-14 sm:flex-nowrap sm:px-6 sm:py-0">
      <Link href="/" className="text-base font-semibold tracking-tight text-bg no-underline">
        {PRODUCT_NAME}
      </Link>
      {/* On phones the links take their own row under the brand. */}
      <nav aria-label="Main" className="order-last flex w-full items-center gap-5 overflow-x-auto pb-1 text-[13px] sm:order-none sm:w-auto sm:gap-4 sm:pb-0">
        <Link href="/dashboard" className="shrink-0 text-bg/80 hover:text-bg no-underline">
          Dashboard
        </Link>
        <Link href="/practice" className="shrink-0 text-bg/80 hover:text-bg no-underline">
          Practice
        </Link>
        <Link href="/billing" className="shrink-0 text-bg/80 hover:text-bg no-underline">
          Billing
        </Link>
        {user.role === "admin" ? (
          <Link href="/admin/charts" className="shrink-0 text-bg/80 hover:text-bg no-underline">
            Charts admin
          </Link>
        ) : null}
      </nav>
      <div className="ml-auto flex min-w-0 items-center gap-3 text-[13px]">
        <span className="hidden max-w-[240px] truncate text-bg/70 md:inline">{user.email}</span>
        <form action={signOut}>
          <Button type="submit" size="sm" variant="ghost" className="text-bg hover:bg-white/10">
            Log out
          </Button>
        </form>
      </div>
    </header>
  );
}
