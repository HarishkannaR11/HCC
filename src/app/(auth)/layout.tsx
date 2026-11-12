import Link from "next/link";
import { PRODUCT_NAME } from "@/lib/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-4 py-12 bg-bg">
      <Link href="/" className="mb-6 text-lg font-semibold tracking-tight text-ink no-underline">
        {PRODUCT_NAME}
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
