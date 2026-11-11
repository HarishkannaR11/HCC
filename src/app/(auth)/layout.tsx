import Link from "next/link";
import { SyntheticDataNotice } from "@/components/synthetic-data-notice";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-6 text-lg font-semibold tracking-tight text-ink">
        Chartwise
      </Link>
      <div className="w-full max-w-sm">{children}</div>
      <SyntheticDataNotice className="mt-8 max-w-sm text-center" />
    </main>
  );
}
