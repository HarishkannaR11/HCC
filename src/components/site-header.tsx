import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { PRODUCT_NAME } from "@/lib/brand";
import type { SessionUser } from "@/lib/auth/session";

export function SiteHeader({ user }: { user: SessionUser }) {
  return (
    <header className="h-14 shrink-0 px-6 flex items-center gap-6 bg-topbar text-bg">
      <Link href="/" className="text-base font-semibold tracking-tight text-bg no-underline">
        {PRODUCT_NAME}
      </Link>
      <nav className="flex items-center gap-4 text-[13px]">
        <Link href="/practice" className="text-bg/80 hover:text-bg no-underline">
          Practice
        </Link>
        {user.role === "admin" ? (
          <Link href="/admin/charts" className="text-bg/80 hover:text-bg no-underline">
            Charts admin
          </Link>
        ) : null}
      </nav>
      <div className="ml-auto flex items-center gap-3 text-[13px]">
        <span className="text-bg/70">{user.email}</span>
        <form action={signOut}>
          <Button type="submit" size="sm" variant="ghost" className="text-bg hover:bg-white/10">
            Log out
          </Button>
        </form>
      </div>
    </header>
  );
}
