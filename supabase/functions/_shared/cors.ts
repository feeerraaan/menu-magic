// Shared across all Edge Functions (existing and AI). `_shared/` is Supabase's documented
// convention for code that should not itself be deployed as a function.

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
