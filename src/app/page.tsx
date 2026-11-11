import { redirect } from "next/navigation";
import { getSessionUser, homeFor } from "@/lib/auth/dal";

// The public landing and pricing page is a later phase. Until then the root
// routes straight to the right place for whoever is asking.
export default async function Home() {
  const user = await getSessionUser();
  redirect(user ? homeFor(user) : "/login");
}
