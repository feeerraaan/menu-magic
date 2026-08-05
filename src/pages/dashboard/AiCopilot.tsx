import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Restaurant } from '@/types/database';
import { useAiCopilot, CopilotChatMessage } from '@/hooks/useAiCopilot';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Bot, Send, Loader2, ShieldAlert, Check, X, Plus, MessageSquare, Trash2 } from 'lucide-react';
import type { MutationChange } from '@ai/copilot';

const FIELD_LABELS: Record<string, string> = {
  name: 'Nombre',
  description: 'Descripción',
  price: 'Precio',
  is_active: 'Activo',
  is_vegan: 'Vegano',
  is_vegetarian: 'Vegetariano',
  is_spicy: 'Picante',
  is_gluten_free: 'Sin gluten',
  allergens: 'Alérgenos',
  created: 'Crear',
  'translation': 'Traducción',
};

function fieldLabel(field: string): string {
  if (field.startsWith('translation[')) return 'Traducción';
  return FIELD_LABELS[field] ?? field;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function PreviewCard({
  preview,
  messageId,
  onConfirm,
  onCancel,
  busy,
}: {
  preview: NonNullable<CopilotChatMessage['pendingPreview']>;
  messageId: string;
  onConfirm: (previewId: string, messageId: string) => Promise<unknown>;
  onCancel: (previewId: string, messageId: string) => Promise<unknown>;
  busy: boolean;
}) {
  const [acting, setActing] = useState<'confirm' | 'cancel' | null>(null);

  const handle = async (kind: 'confirm' | 'cancel') => {
    setActing(kind);
    try {
      if (kind === 'confirm') await onConfirm(preview.preview_id, messageId);
      else await onCancel(preview.preview_id, messageId);
    } finally {
      setActing(null);
    }
  };

  const grouped = preview.changes.reduce<Record<string, MutationChange[]>>((acc, c) => {
    const key = `${c.entity_type}:${c.entity_id}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  return (
    <div
      className={cn(
        'mt-2 rounded-lg border p-3 space-y-2',
        preview.destructive ? 'border-destructive/40 bg-destructive/5' : 'border-primary/30 bg-primary/5',
      )}
    >
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-medium">{preview.summary}</p>
      </div>

      {preview.affected_count > 0 && (
        <div className="text-xs text-muted-foreground">{preview.affected_count} elemento(s) afectado(s)</div>
      )}

      {Object.entries(grouped).slice(0, 12).map(([key, changes]) => (
        <div key={key} className="rounded bg-background/60 p-2 space-y-1">
          <p className="text-xs font-semibold">{changes[0].entity_name}</p>
          {changes.map((c, i) => (
            <p key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="font-medium text-foreground">{fieldLabel(c.field)}</span>
              <span className="text-muted-foreground line-through">{formatValue(c.before)}</span>
              <span>→</span>
              <span className="font-medium text-foreground">{formatValue(c.after)}</span>
            </p>
          ))}
        </div>
      ))}

      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          onClick={() => handle('confirm')}
          disabled={busy || acting !== null}
          className="gap-1.5"
        >
          {acting === 'confirm' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Confirmar
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handle('cancel')}
          disabled={busy || acting !== null}
          className="gap-1.5"
        >
          <X className="h-3.5 w-3.5" /> Cancelar
        </Button>
      </div>
    </div>
  );
}

function MessageBubble({ message, onConfirm, onCancel, busy }: {
  message: CopilotChatMessage;
  onConfirm: (previewId: string, messageId: string) => Promise<unknown>;
  onCancel: (previewId: string, messageId: string) => Promise<unknown>;
  busy: boolean;
}) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex gap-2', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Bot className="h-4 w-4" />
        </div>
      )}
      <div className={cn('max-w-[80%] space-y-1', isUser && 'items-end')}>
        <div
          className={cn(
            'rounded-xl px-3 py-2 text-sm',
            isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
          )}
        >
          {message.content}
        </div>
        {message.pendingPreview && (
          <PreviewCard
            preview={message.pendingPreview}
            messageId={message.id}
            onConfirm={onConfirm}
            onCancel={onCancel}
            busy={busy}
          />
        )}
      </div>
    </div>
  );
}

export default function AiCopilot() {
  const { restaurant } = useOutletContext<{ restaurant: Restaurant }>();
  const { messages, sending, error, conversations, send, confirmPreview, cancelPreview, openConversation, newConversation } =
    useAiCopilot(restaurant?.id);
  const { toast } = useToast();
  const [input, setInput] = useState('');

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    try {
      await send(text);
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Error desconocido', variant: 'destructive' });
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) +
    ' ' +
    new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" /> Copilot IA
          </h2>
          <p className="text-muted-foreground">
            Pide cambios en tu menú en lenguaje natural. Todo cambio requiere tu confirmación antes de aplicarse.
          </p>
        </div>
        <Button variant="outline" onClick={newConversation} className="gap-2">
          <Plus className="h-4 w-4" /> Nueva conversación
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <Card className="h-[540px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Conversaciones</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <ScrollArea className="h-[480px]">
              <div className="space-y-1">
                {conversations.length === 0 && (
                  <p className="text-xs text-muted-foreground p-3">Todavía no hay conversaciones.</p>
                )}
                {conversations.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => openConversation(c.id)}
                    className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors"
                  >
                    <p className="truncate font-medium">{c.title || 'Conversación'}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(c.updated_at)}</p>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="h-[540px] flex flex-col">
          <CardContent className="flex-1 flex flex-col min-h-0 p-0">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-16 space-y-2">
                    <Bot className="h-12 w-12 mx-auto text-muted-foreground opacity-40" />
                    <p className="font-medium">¿Qué quieres hacer con tu menú?</p>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      Prueba: "Sube un 10% el precio de los vinos", "Añade 3 opciones veganas a Entrantes",
                      "Oculta todos los platos picantes" o "Traduce la carta de postres al inglés".
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 pt-2">
                      {[
                        'Sube un 10% el precio de los vinos',
                        'Oculta todos los platos picantes',
                        'Añade 3 opciones veganas a Entrantes',
                      ].map((s) => (
                        <Badge
                          key={s}
                          variant="outline"
                          className="cursor-pointer hover:bg-primary/10"
                          onClick={() => {
                            setInput(s);
                          }}
                        >
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((m) => (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    onConfirm={confirmPreview}
                    onCancel={cancelPreview}
                    busy={sending}
                  />
                ))}
                {sending && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> El Copilot está trabajando...
                  </div>
                )}
                {error && (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                    {error.message}
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="border-t p-3">
              <div className="flex gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Describe el cambio que quieres hacer en tu menú..."
                  rows={2}
                  className="resize-none"
                />
                <Button onClick={handleSend} disabled={sending || !input.trim()} className="h-auto self-stretch px-4">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                Los cambios se muestran como vista previa y solo se aplican cuando los confirmas.{" "}
                <Badge variant="secondary" className="text-[10px]">2 créditos IA por mensaje</Badge>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
