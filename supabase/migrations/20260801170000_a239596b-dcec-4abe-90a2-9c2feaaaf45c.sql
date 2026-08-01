-- Phase 6 — AI Restaurant Copilot: conversation persistence, message log, and the forensic
-- action audit trail. See docs/FEATURE_SPECIFICATIONS.md §Phase 6 and docs/AI_ARCHITECTURE.md.
--
-- RLS model:
--   * ai_copilot_conversations: owner SELECT + INSERT (starting a chat is a normal user action);
--     UPDATE/DELETE blocked for authenticated (chat lifecycle is server-driven).
--   * ai_copilot_messages: owner SELECT only. Messages are written exclusively by the Edge
--     Function via the service-role client (the LLM conversation persists server-side).
--   * ai_copilot_actions: owner SELECT only, no client writes. This is the audit log of what
--     the AI did (previewed/confirmed/cancelled/executed/failed) and must survive chat pruning.

ALTER TYPE public.ai_usage_kind ADD VALUE IF NOT EXISTS 'copilot';

CREATE TABLE public.ai_copilot_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  title TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_copilot_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view copilot conversations" ON public.ai_copilot_conversations
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.restaurants WHERE id = restaurant_id AND owner_id = auth.uid()));

CREATE POLICY "Owners can start copilot conversations" ON public.ai_copilot_conversations
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.restaurants WHERE id = restaurant_id AND owner_id = auth.uid()));

CREATE POLICY "No direct copilot conversation updates" ON public.ai_copilot_conversations
  FOR UPDATE TO authenticated WITH CHECK (false);

CREATE POLICY "No direct copilot conversation deletion" ON public.ai_copilot_conversations
  FOR DELETE TO authenticated USING (false);

CREATE TRIGGER set_ai_copilot_conversations_updated_at BEFORE UPDATE ON public.ai_copilot_conversations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.ai_copilot_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_copilot_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_copilot_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view copilot messages" ON public.ai_copilot_messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.ai_copilot_conversations c
    JOIN public.restaurants r ON r.id = c.restaurant_id
    WHERE c.id = conversation_id AND r.owner_id = auth.uid()
  ));

CREATE POLICY "No direct copilot message writes" ON public.ai_copilot_messages
  FOR INSERT TO authenticated WITH CHECK (false);

CREATE POLICY "No direct copilot message updates" ON public.ai_copilot_messages
  FOR UPDATE TO authenticated WITH CHECK (false);

CREATE POLICY "No direct copilot message deletion" ON public.ai_copilot_messages
  FOR DELETE TO authenticated USING (false);

CREATE TABLE public.ai_copilot_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.ai_copilot_conversations(id) ON DELETE SET NULL,
  message_id UUID,
  user_request_text TEXT,
  tool_name TEXT NOT NULL,
  raw_llm_tool_input JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolved_params JSONB NOT NULL DEFAULT '{}'::jsonb,
  preview_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'previewed'
    CHECK (status IN ('previewed', 'confirmed', 'cancelled', 'executed', 'failed', 'partially_failed')),
  affected_rows JSONB NOT NULL DEFAULT '[]'::jsonb,
  confirmed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_copilot_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view copilot actions" ON public.ai_copilot_actions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.restaurants WHERE id = restaurant_id AND owner_id = auth.uid()));

-- The action trail is written exclusively by the Edge Function (service-role); the client
-- never inserts/updates/deletes it directly — same "no direct write" pattern as ai_usage.
CREATE POLICY "No direct copilot action writes" ON public.ai_copilot_actions
  FOR INSERT TO authenticated WITH CHECK (false);

CREATE POLICY "No direct copilot action updates" ON public.ai_copilot_actions
  FOR UPDATE TO authenticated WITH CHECK (false);

CREATE POLICY "No direct copilot action deletion" ON public.ai_copilot_actions
  FOR DELETE TO authenticated USING (false);

CREATE TRIGGER set_ai_copilot_actions_updated_at BEFORE UPDATE ON public.ai_copilot_actions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
