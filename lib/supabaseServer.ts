import { createClient } from "@supabase/supabase-js";

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export function createSupabaseAdmin() {
  const serverSecret =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serverSecret)
    throw new Error(
      "SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is not configured.",
    );
  return createClient(
    required("NEXT_PUBLIC_SUPABASE_URL"),
    serverSecret,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function authenticateRequest(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const client = createClient(
    required("NEXT_PUBLIC_SUPABASE_URL"),
    required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
  const { data, error } = await client.auth.getUser(token);
  return error ? null : data.user;
}
