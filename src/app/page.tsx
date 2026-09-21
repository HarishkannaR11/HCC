import { redirect } from "next/navigation";

// Phase 1 has exactly one chart; send the root straight into it. A charts
// list becomes a real route once there's more than one to choose from.
export default function Home() {
  redirect("/practice/dm-ckd-copd-72m");
}
