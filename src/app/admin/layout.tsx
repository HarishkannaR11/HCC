import { SiteHeader } from "@/components/site-header";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireAdmin();
  return (
    <div className="min-h-dvh flex flex-col">
      <SiteHeader user={user} />
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
