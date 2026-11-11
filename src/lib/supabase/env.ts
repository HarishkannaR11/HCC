/**
 * Public Supabase settings, safe for any runtime.
 *
 * Supabase now issues "publishable" keys alongside the legacy anon key; either
 * works here, and both are designed to be shipped to the browser — RLS is what
 * protects the data.
 */
export function supabaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL");
  // The dashboard offers the URL with the Data API path appended; the client wants the origin.
  return raw.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
}

export function supabasePublishableKey(): string {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error(
      "Missing required environment variable: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)",
    );
  }
  return key;
}
