import { AppShell } from "@/components/app-shell";
import { requireAdmin } from "@/lib/auth/dal";

export const metadata = { title: "Chart admin · Chartwise" };

// Layouts are not a security boundary on their own (they do not re-run on
// client navigation), so every admin page and action also checks the role.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireAdmin();
  return <AppShell user={user}>{children}</AppShell>;
}
