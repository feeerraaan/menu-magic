// Shared JWT-check + RLS-scoped/service-role client helpers for AI Edge Functions.
// Mirrors the manual auth.getUser(token) pattern already used in check-subscription/
// create-checkout, but factored out since 4+ new AI functions need the identical logic.
// See docs/AI_ARCHITECTURE.md §6 for the anon+JWT-vs-service-role client rationale.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders } from "./cors.ts";

export interface AuthedContext {
  userId: string;
  email: string | null;
  // RLS-scoped: reads/writes through this client are enforced exactly as the calling user —
  // safe default for everything except the specific tables that block authenticated writes
  // outright (ai_jobs status transitions, ai_usage, ai_menu_scores).
  supabaseUser: SupabaseClient;
  // Service-role: bypasses RLS. Use ONLY for the writes RLS explicitly blocks for
  // authenticated users — never broaden its use beyond that.
  supabaseService: SupabaseClient;
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Validates the caller's JWT and returns both an RLS-scoped client (respects the caller's
 * own row-level permissions) and a service-role client (for the narrow set of writes RLS
 * blocks outright). Returns an error Response if the request is unauthenticated/invalid —
 * callers should check `"response" in result` before proceeding.
 */
export async function authenticate(req: Request): Promise<AuthedContext | { response: Response }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { response: jsonResponse({ error: "Unauthorized" }, 401) };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const supabaseUser = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userError } = await supabaseUser.auth.getUser(token);
  if (userError || !userData.user) {
    return { response: jsonResponse({ error: "Invalid session" }, 401) };
  }

  const supabaseService = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  return {
    userId: userData.user.id,
    email: userData.user.email ?? null,
    supabaseUser,
    supabaseService,
  };
}
