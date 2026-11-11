"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** "N" goes to the next chart from the result screen. */
export function NextChartShortcut({ href }: { href: string }) {
  const router = useRouter();
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== "n" || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      router.push(href);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [href, router]);
  return null;
}
