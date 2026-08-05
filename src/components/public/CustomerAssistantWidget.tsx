import { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Loader2, MessageCircle } from 'lucide-react';
import * as aiApi from '@/lib/ai-api';
import type { CustomerAssistantMessage } from '@ai/customerAssistant';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

interface WidgetMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  recommendations?: CustomerAssistantMessage[];
}

const SESSION_KEY = 'sacarta-assistant-session';

function getSessionToken(): string {
  let token = localStorage.getItem(SESSION_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, token);
  }
  return token;
}

export function CustomerAssistantWidget({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<WidgetMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending, open]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setError(null);
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', content: text }]);
    setSending(true);
    try {
      const res = await aiApi.sendCustomerAssistantMessage({
        slug,
        sessionToken: getSessionToken(),
        message: text,
      });
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: res.reply,
          recommendations: res.recommendations,
        },
      ]);
      if (res.rateLimited) {
        setError(res.rateLimitMessage || t('publicWidget.tooMany'));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('publicWidget.connectError'));
    } finally {
      setSending(false);
    }
  };

  const formatPrice = (price: number | null) => {
    if (price === null) return '';
    return `${price.toFixed(2)} €`;
  };

  return (
    <>
      {/* Launcher button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition-opacity"
          aria-label={t('publicWidget.title')}
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 flex h-[480px] w-[360px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">{t('publicWidget.title')}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t('publicWidget.hint')}
                </p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-900 dark:hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="text-center text-sm text-slate-500 dark:text-slate-400 pt-6 space-y-2">
                <Bot className="h-10 w-10 mx-auto opacity-40" />
                <p>{t('publicWidget.hello')}</p>
                <p className="text-xs">{t('publicWidget.examples')}</p>
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-[85%] rounded-2xl px-3 py-2 text-sm', m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-slate-100 dark:bg-slate-900')}>
                  <p className="whitespace-pre-line">{m.content}</p>
                  {m.recommendations && m.recommendations.length > 0 && (
                    <div className="mt-2 space-y-1.5 border-t border-slate-200 dark:border-slate-800 pt-2">
                      {m.recommendations.map((r) => (
                        <div key={r.item_id} className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium">{r.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{r.explanation}</p>
                          </div>
                          {formatPrice(r.price) && (
                            <span className="shrink-0 text-xs font-semibold">{formatPrice(r.price)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl bg-slate-100 dark:bg-slate-900 px-3 py-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> {t('publicWidget.thinking')}
                </div>
              </div>
            )}
            {error && <p className="text-center text-xs text-red-600 dark:text-red-400">{error}</p>}
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800 p-3">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={t('publicWidget.placeholder')}
                className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={handleSend}
                disabled={sending || !input.trim()}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
                aria-label={t('publicWidget.send')}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
