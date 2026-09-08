import { supabase } from "@/lib/supabase";

// Sends the Supabase session token with every test API call
export async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token || "";
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}