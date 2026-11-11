import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SyntheticDataNotice } from "@/components/synthetic-data-notice";
import { signOut } from "@/app/(auth)/actions";
import type { SessionUser } from "@/lib/auth/dal";

/** Chrome for the list and admin pages. The encoder screen has its own full-bleed layout. */
export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-6 bg-topbar px-6 text-bg">
        <Link href="/" className="text-base font-semibold tracking-tight">
          Chartwise
        </Link>
        <nav className="flex items-center gap-4 text-[13px]">
          <Link href="/practice" className="opacity-80 hover:opacity-100">
            Practice
          </Link>
          {user.role === "admin" ? (
            <Link href="/admin/charts" className="opacity-80 hover:opacity-100">
              Chart admin
            </Link>
          ) : null}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-[13px]">
          <span className="opacity-70">{user.fullName ?? user.email}</span>
          <form action={signOut}>
            <Button type="submit" size="sm" variant="ghost" className="text-bg hover:bg-white/10">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
      <footer className="border-t border-border px-6 py-4">
        <SyntheticDataNotice className="mx-auto max-w-6xl" />
      </footer>
    </div>
  );
}
