import { useState, useEffect, useCallback } from 'react';
import * as aiApi from '@/lib/ai-api';
import { useTranslation } from '@/hooks/useTranslation';
import type { CopilotMessageTurn, MutationPreview } from '@ai/copilot';

export interface CopilotChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  pendingPreview?: MutationPreview;
}

export function useAiCopilot(restaurantId: string | undefined) {
  const { t } = useTranslation();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CopilotChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [conversations, setConversations] = useState<{ id: string; title: string | null; updated_at: string }[]>([]);

  const ensureConversation = useCallback(async (): Promise<string> => {
    if (conversationId) return conversationId;
    if (!restaurantId) throw new Error('No restaurant');
    const { conversationId: newId } = await aiApi.startCopilotConversation({ restaurantId });
    setConversationId(newId);
    return newId;
  }, [conversationId, restaurantId]);

  const refreshConversations = useCallback(async () => {
    if (!restaurantId) return;
    try {
      const { conversations: list } = await aiApi.listCopilotConversations({ restaurantId });
      setConversations(list);
    } catch {
      // non-fatal
    }
  }, [restaurantId]);

  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  const openConversation = useCallback(
    async (id: string) => {
      if (!restaurantId) return;
      setConversationId(id);
      const { messages: history } = await aiApi.fetchCopilotHistory({ restaurantId, conversationId: id });
      setMessages(
        history
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content ?? '',
            createdAt: m.created_at,
          })),
      );
    },
    [restaurantId],
  );

  const newConversation = useCallback(() => {
    setConversationId(null);
    setMessages([]);
  }, []);

  const send = async (text: string) => {
    if (!restaurantId) throw new Error('No restaurant');
    const convId = await ensureConversation();
    setSending(true);
    setError(null);
    const userMsg: CopilotChatMessage = { id: `local-${Date.now()}`, role: 'user', content: text, createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    try {
      const turn = await aiApi.sendCopilotMessage({ restaurantId, conversationId: convId, message: text });
      if (turn.kind === 'text') {
        setMessages((prev) => [
          ...prev,
          { id: `local-${Date.now() + 1}`, role: 'assistant', content: turn.reply, createdAt: new Date().toISOString() },
        ]);
      } else if (turn.kind === 'preview') {
        setMessages((prev) => [
          ...prev,
          {
            id: `local-${Date.now() + 1}`,
            role: 'assistant',
            content: turn.reply,
            createdAt: new Date().toISOString(),
            pendingPreview: turn.preview,
          },
        ]);
      } else {
        setError(new Error(turn.error));
      }
      await refreshConversations();
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setSending(false);
    }
  };

  const confirmPreview = async (previewId: string, messageId: string) => {
    if (!restaurantId) throw new Error('No restaurant');
    setSending(true);
    setError(null);
    try {
      const res = await aiApi.confirmCopilotPreview({ restaurantId, previewId });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, pendingPreview: undefined, content: `${m.content} · ${t('copilot.applied', { count: res.appliedChanges })}` }
            : m,
        ),
      );
      return res;
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setSending(false);
    }
  };

  const cancelPreview = async (previewId: string, messageId: string) => {
    if (!restaurantId) throw new Error('No restaurant');
    setSending(true);
    setError(null);
    try {
      await aiApi.cancelCopilotPreview({ restaurantId, previewId });
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, pendingPreview: undefined, content: `${m.content} · ${t('copilot.canceled')}` } : m)),
      );
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setSending(false);
    }
  };

  return { messages, sending, error, conversations, send, confirmPreview, cancelPreview, openConversation, newConversation };
}
