// AI Restaurant Copilot (Phase 6) — the highest-risk feature in the roadmap. This Edge
// Function is the ONLY entry point into the Copilot from the frontend. It authenticates the
// owner, charges credits, persists the conversation server-side, runs the tool-calling loop,
// and — critically — never applies a mutation without an owner-confirmed preview.
//
// Endpoints (all POST, JWT-authenticated):
//   { action: 'start_conversation', restaurantId, title? }       -> { conversationId }
//   { action: 'send_message', restaurantId, conversationId, message } -> { kind: 'text'|'preview', ... }
//   { action: 'confirm_preview', restaurantId, previewId }         -> { actionId, summary, appliedChanges }
//   { action: 'cancel_preview', restaurantId, previewId }          -> { actionId, status: 'cancelled' }
//   { action: 'list_conversations', restaurantId }                 -> { conversations }
//   { action: 'get_history', restaurantId, conversationId }        -> { messages }
//
// See docs/FEATURE_SPECIFICATIONS.md §Phase 6 (core safety rule + preview/confirm gate).

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { authenticate, jsonResponse } from "../_shared/aiAuth.ts";
import { checkAiCredits, chargeAiCredits, AI_CREDIT_COSTS } from "../_shared/aiCredits.ts";
import { getProviderForFeature } from "../../../packages/ai/providers/registry.ts";
import { loadMenuGraph, type ComputedPreview } from "../../../packages/ai/tools/resolver.ts";
import { executePreview } from "../../../packages/ai/tools/executor.ts";
import { runCopilotLoop } from "../../../packages/ai/agents/copilotAgent.ts";
import { copilotT, isCopilotLang, type CopilotLang } from "../../../packages/ai/prompts/copilotL10n.ts";
import type { LLMMessage } from "../../../packages/ai/providers/types.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const PREVIEW_TTL_MS = 15 * 60 * 1000; // 15 minutes — see FEATURE_SPECIFICATIONS.md §Phase 6
const HISTORY_SLIDING_WINDOW = 20;

// Owner language for the Copilot's deterministic strings: the client's UI language, else
// the restaurant's default language, else Spanish.
function resolveLang(body: ActionBody, fallback: string | undefined): CopilotLang {
  if (isCopilotLang(String(body.language ?? ''))) return String(body.language) as CopilotLang;
  if (isCopilotLang(fallback ?? '')) return fallback as CopilotLang;
  return 'es';
}

interface ActionBody {
  action?: string;
  restaurantId?: string;
  conversationId?: string;
  previewId?: string;
  message?: string;
  title?: string;
  language?: string;
}

interface DbMessage {
  id: string;
  role: string;
  content: string | null;
  created_at: string;
}

async function requireRestaurant(supabaseUser: SupabaseClient, restaurantId: string) {
  const { data, error } = await supabaseUser
    .from("restaurants")
    .select("id")
    .eq("id", restaurantId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Restaurant not found");
}

// Loads the last N messages of a conversation, mapped to LLM message history (user/assistant
// text only — tool internals are reconstructed fresh per turn).
async function loadHistory(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<LLMMessage[]> {
  const { data, error } = await supabase
    .from("ai_copilot_messages")
    .select("role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(HISTORY_SLIDING_WINDOW);
  if (error) throw error;
  const rows = ((data ?? []) as DbMessage[]).reverse();
  return rows
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role, content: m.content ?? '' }) as LLMMessage);
}

async function saveMessage(
  supabase: SupabaseClient,
  conversationId: string,
  role: string,
  content: string,
): Promise<void> {
  const { error } = await supabase.from("ai_copilot_messages").insert({ conversation_id: conversationId, role, content });
  if (error) throw error;
}

async function touchConversation(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<void> {
  await supabase.from("ai_copilot_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
}

async function previewRow(
  supabase: SupabaseClient,
  previewId: string,
  restaurantId: string,
) {
  const { data, error } = await supabase
    .from("ai_copilot_actions")
    .select("*")
    .eq("id", previewId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as {
    id: string;
    restaurant_id: string;
    conversation_id: string | null;
    tool_name: string;
    resolved_params: Record<string, unknown>;
    preview_payload: { computed: ComputedPreview; summary: string; destructive: boolean; affected_count: number };
    status: string;
    expires_at: string | null;
    user_request_text: string | null;
    raw_llm_tool_input: Record<string, unknown>;
    user_id: string | null;
    message_id: string | null;
  } | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticate(req);
    if ("response" in auth) return auth.response;
    const { supabaseUser, supabaseService, userId } = auth;

    const body = (await req.json()) as ActionBody;
    const action = body.action;
    const restaurantId = body.restaurantId;

    if (!action || !restaurantId) {
      return jsonResponse({ error: "action and restaurantId are required" }, 400);
    }
    await requireRestaurant(supabaseUser, restaurantId);

    switch (action) {
      case "start_conversation": {
        const { data, error } = await supabaseUser
          .from("ai_copilot_conversations")
          .insert({ restaurant_id: restaurantId, title: body.title ?? null })
          .select("id")
          .single();
        if (error) throw error;
        return jsonResponse({ conversationId: (data as { id: string }).id });
      }

      case "send_message": {
        const conversationId = body.conversationId;
        const message = body.message;
        if (!conversationId || !message?.trim()) {
          return jsonResponse({ error: "conversationId and message are required" }, 400);
        }

        const creditCheck = await checkAiCredits(supabaseUser, restaurantId, "copilot");
        if (!creditCheck.allowed) {
          return jsonResponse(
            { error: "AI credit limit reached for this plan", used: creditCheck.used, limit: creditCheck.limit },
            402,
          );
        }

        await saveMessage(supabaseService, conversationId, "user", message.trim());

        const graph = await loadMenuGraph(supabaseUser, restaurantId);
        const history = await loadHistory(supabaseUser, conversationId);
        const provider = getProviderForFeature("copilot");

        // Owner language: explicit from the client, else the restaurant's default language.
        const lang = resolveLang(body, graph.defaultLanguage);

        const turn = await runCopilotLoop(provider, graph, history, message.trim(), lang);

        // Charge the copilot turn (message + any tool calls).
        await chargeAiCredits(supabaseService, restaurantId, "copilot", {
          metadata: { conversationId },
        });

        if (turn.preview) {
          // Persist the pending action + a stub assistant message; the real outcome is
          // recorded when the owner confirms/cancels.
          const { computed, rawLlmInput } = turn.preview;
          const { data: actionRow, error: actionError } = await supabaseService
            .from("ai_copilot_actions")
            .insert({
              restaurant_id: restaurantId,
              user_id: userId,
              conversation_id: conversationId,
              user_request_text: message.trim(),
              tool_name: turn.preview.toolName,
              raw_llm_tool_input: rawLlmInput,
              resolved_params: computed.resolved,
              preview_payload: {
                computed,
                summary: computed.summary,
                destructive: computed.destructive,
                affected_count: computed.affected_count,
              },
              status: "previewed",
              expires_at: new Date(Date.now() + PREVIEW_TTL_MS).toISOString(),
            })
            .select("id")
            .single();
          if (actionError) throw actionError;

          await saveMessage(
            supabaseService,
            conversationId,
            "assistant",
            copilotT(lang, 'confirm_needed', { summary: computed.summary }),
          );
          await touchConversation(supabaseService, conversationId);

          return jsonResponse({
            kind: "preview",
            reply: computed.summary,
            preview: {
              preview_id: (actionRow as { id: string }).id,
              tool_name: turn.preview.toolName,
              summary: computed.summary,
              destructive: computed.destructive,
              affected_count: computed.affected_count,
              changes: computed.changes,
              expires_at: new Date(Date.now() + PREVIEW_TTL_MS).toISOString(),
            },
          });
        }

        await saveMessage(supabaseService, conversationId, "assistant", turn.reply ?? "");
        await touchConversation(supabaseService, conversationId);
        return jsonResponse({ kind: "text", reply: turn.reply ?? "" });
      }

      case "confirm_preview": {
        const previewId = body.previewId;
        if (!previewId) return jsonResponse({ error: "previewId is required" }, 400);

        const action = await previewRow(supabaseUser, previewId, restaurantId);
        if (!action) return jsonResponse({ error: "Preview not found" }, 404);
        if (action.status !== "previewed") {
          return jsonResponse({ error: `Preview already ${action.status}` }, 409);
        }
        // Re-load a fresh graph so the executor operates on current data (no drift).
        const graph = await loadMenuGraph(supabaseUser, restaurantId);
        const lang = resolveLang(body, graph.defaultLanguage);
        if (action.expires_at && new Date(action.expires_at).getTime() < Date.now()) {
          await supabaseService.from("ai_copilot_actions").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", previewId);
          return jsonResponse({ error: copilotT(lang, 'preview_expired') }, 410);
        }

        const computed = (action.preview_payload?.computed ?? {}) as ComputedPreview;

        try {
          const result = await executePreview(supabaseUser, graph, action.tool_name, computed);
          await supabaseService
            .from("ai_copilot_actions")
            .update({
              status: "executed",
              affected_rows: result.changes,
              confirmed_by: userId,
              updated_at: new Date().toISOString(),
            })
            .eq("id", previewId);

          if (action.conversation_id) {
            await saveMessage(
              supabaseService,
              action.conversation_id,
              "assistant",
              copilotT(lang, 'applied', { n: result.applied }),
            );
            await touchConversation(supabaseService, action.conversation_id);
          }

          return jsonResponse({ actionId: previewId, summary: action.preview_payload?.summary ?? '', appliedChanges: result.applied });
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          await supabaseService
            .from("ai_copilot_actions")
            .update({ status: "failed", affected_rows: [], updated_at: new Date().toISOString() })
            .eq("id", previewId);
          return jsonResponse({ error: message }, 500);
        }
      }

      case "cancel_preview": {
        const previewId = body.previewId;
        if (!previewId) return jsonResponse({ error: "previewId is required" }, 400);
        const action = await previewRow(supabaseUser, previewId, restaurantId);
        if (!action) return jsonResponse({ error: "Preview not found" }, 404);
        if (action.status !== "previewed") {
          return jsonResponse({ error: `Preview already ${action.status}` }, 409);
        }
        await supabaseService
          .from("ai_copilot_actions")
          .update({ status: "cancelled", updated_at: new Date().toISOString() })
          .eq("id", previewId);
        if (action.conversation_id) {
          await saveMessage(supabaseService, action.conversation_id, "assistant", copilotT(resolveLang(body, undefined), 'cancelled'));
          await touchConversation(supabaseService, action.conversation_id);
        }
        return jsonResponse({ actionId: previewId, status: "cancelled" });
      }

      case "list_conversations": {
        const { data, error } = await supabaseUser
          .from("ai_copilot_conversations")
          .select("id, restaurant_id, title, status, created_at, updated_at")
          .eq("restaurant_id", restaurantId)
          .order("updated_at", { ascending: false })
          .limit(50);
        if (error) throw error;
        return jsonResponse({ conversations: data ?? [] });
      }

      case "get_history": {
        const conversationId = body.conversationId;
        if (!conversationId) return jsonResponse({ error: "conversationId is required" }, 400);
        const { data, error } = await supabaseUser
          .from("ai_copilot_messages")
          .select("id, role, content, created_at")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });
        if (error) throw error;
        return jsonResponse({ messages: data ?? [] });
      }

      default:
        return jsonResponse({ error: `Unknown action "${action}"` }, 400);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[ai-copilot] ERROR", message);
    return jsonResponse({ error: message }, 500);
  }
});
