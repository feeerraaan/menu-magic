import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Loader2, ShieldCheck, Users, Ticket, MessageSquare } from 'lucide-react';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useTranslation } from '@/hooks/useTranslation';
import { useToast } from '@/hooks/use-toast';
import * as adminApi from '@/lib/admin-api';
import { PLAN_LIMITS } from '@/lib/subscription-limits';
import { RestaurantDetail } from '@/components/dashboard/admin/RestaurantDetail';

const PLAN_KEYS: Record<string, string> = {
  free: 'admin.planFree',
  pro_monthly: 'admin.planProMonthly',
  pro_annual: 'admin.planProAnnual',
  lifetime: 'admin.planLifetime',
};

interface EditTarget {
  restaurant_id: string;
  name: string;
  is_published: boolean;
  plan: string;
  photos_limit: number;
  languages_limit: number;
}

export default function Admin() {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const { t } = useTranslation();

  if (adminLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto text-center py-20">
        <ShieldCheck className="h-12 w-12 mx-auto text-muted-foreground" />
        <h2 className="font-display text-2xl font-bold">{t('admin.accessDenied')}</h2>
        <p className="text-muted-foreground">{t('admin.accessDeniedDesc')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold">{t('admin.title')}</h2>
        <p className="text-muted-foreground">{t('admin.subtitle')}</p>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users" className="gap-1.5">
            <Users className="h-4 w-4" /> {t('admin.tabs.users')}
          </TabsTrigger>
          <TabsTrigger value="coupons" className="gap-1.5">
            <Ticket className="h-4 w-4" /> {t('admin.tabs.coupons')}
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-1.5">
            <MessageSquare className="h-4 w-4" /> {t('admin.tabs.messages')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
        <TabsContent value="coupons">
          <CouponsTab />
        </TabsContent>
        <TabsContent value="messages">
          <MessagesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function UsersTab() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [rows, setRows] = useState<adminApi.AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditTarget | null>(null);
  const [detail, setDetail] = useState<adminApi.AdminUserRow | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await adminApi.adminListUsers());
    } catch (e) {
      toast({ title: t('common.error'), description: e instanceof Error ? e.message : t('common.unknownError'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const openEdit = (row: adminApi.AdminUserRow) => {
    setEditing({
      restaurant_id: row.restaurant_id ?? '',
      name: row.restaurant_name ?? '',
      is_published: row.is_published ?? false,
      plan: row.plan ?? 'free',
      photos_limit: row.photos_limit ?? PLAN_LIMITS.free.photos,
      languages_limit: row.languages_limit ?? PLAN_LIMITS.free.languages,
    });
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await adminApi.adminUpdateRestaurant(editing.restaurant_id, editing.name, editing.is_published);
      await adminApi.adminUpdateSubscription(editing.restaurant_id, editing.plan, editing.photos_limit, editing.languages_limit);
      toast({ title: t('admin.saved'), description: t('admin.changesApplied') });
      setEditing(null);
      await load();
    } catch (e) {
      toast({ title: t('common.error'), description: e instanceof Error ? e.message : t('common.unknownError'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('admin.usersTitle')}</CardTitle>
        <CardDescription>{t('admin.usersCount', { n: rows.length })}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.colEmail')}</TableHead>
                <TableHead>{t('admin.colRestaurant')}</TableHead>
                <TableHead>{t('admin.colPlan')}</TableHead>
                <TableHead>{t('admin.colStatus')}</TableHead>
                <TableHead>{t('admin.colLimits')}</TableHead>
                <TableHead>{t('admin.colPublished')}</TableHead>
                <TableHead className="text-right">{t('admin.colActions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.user_id}>
                  <TableCell className="font-medium">{row.email}</TableCell>
                  <TableCell>{row.restaurant_name ?? ''}</TableCell>
                  <TableCell>
                    <Badge variant={row.plan === 'free' ? 'secondary' : 'default'}>
                      {t(PLAN_KEYS[row.plan ?? 'free']) || row.plan}
                    </Badge>
                  </TableCell>
                  <TableCell>{row.subscription_status ?? ''}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {t('admin.limitsFormat', { photos: row.photos_limit ?? 0, languages: row.languages_limit ?? 1 })}
                  </TableCell>
                  <TableCell>{row.is_published ? t('admin.yes') : t('admin.no')}</TableCell>
                  <TableCell className="text-right">
                    {row.restaurant_id && (
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setDetail(row)}>
                          {t('admin.view')}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openEdit(row)}>
                          {t('admin.edit')}
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('admin.editRestaurant')}</DialogTitle>
            </DialogHeader>
            {editing && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('admin.name')}</Label>
                  <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t('admin.plan')}</Label>
                  <Select value={editing.plan} onValueChange={(v) => setEditing({ ...editing, plan: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">{t('admin.planFree')}</SelectItem>
                      <SelectItem value="pro_monthly">{t('admin.planProMonthly')}</SelectItem>
                      <SelectItem value="pro_annual">{t('admin.planProAnnual')}</SelectItem>
                      <SelectItem value="lifetime">{t('admin.planLifetime')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('admin.photos')}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={editing.photos_limit}
                      onChange={(e) => setEditing({ ...editing, photos_limit: Number(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('admin.languages')}</Label>
                    <Input
                      type="number"
                      min={1}
                      value={editing.languages_limit}
                      onChange={(e) => setEditing({ ...editing, languages_limit: Number(e.target.value) || 1 })}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="published">{t('admin.menuPublished')}</Label>
                  <Switch
                    id="published"
                    checked={editing.is_published}
                    onCheckedChange={(v) => setEditing({ ...editing, is_published: v })}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>{t('admin.cancel')}</Button>
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                {t('admin.save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {detail?.restaurant_id && (
          <RestaurantDetail
            restaurantId={detail.restaurant_id}
            restaurantName={detail.restaurant_name ?? ''}
            onClose={() => setDetail(null)}
            onChanged={load}
          />
        )}
      </CardContent>
    </Card>
  );
}

function CouponsTab() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [percentOff, setPercentOff] = useState('');
  const [maxRedemptions, setMaxRedemptions] = useState('');
  const [expiresDays, setExpiresDays] = useState('');
  const [coupons, setCoupons] = useState<adminApi.AdminCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCoupons(await adminApi.adminListCoupons());
    } catch (e) {
      toast({ title: t('common.error'), description: e instanceof Error ? e.message : t('common.unknownError'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    setCreating(true);
    try {
      const result = await adminApi.adminCreateCoupon({
        code,
        percent_off: Number(percentOff),
        max_redemptions: maxRedemptions ? Number(maxRedemptions) : undefined,
        expires_days: expiresDays ? Number(expiresDays) : undefined,
      });
      toast({ title: t('admin.couponCreated'), description: t('admin.code', { code: result.code, pct: result.percent_off }) });
      setCode('');
      setPercentOff('');
      setMaxRedemptions('');
      setExpiresDays('');
      await load();
    } catch (e) {
      toast({ title: t('common.error'), description: e instanceof Error ? e.message : t('common.unknownError'), variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const deactivate = async (id: string) => {
    try {
      await adminApi.adminDeactivateCoupon(id);
      toast({ title: t('admin.couponDeactivated') });
      await load();
    } catch (e) {
      toast({ title: t('common.error'), description: e instanceof Error ? e.message : t('common.unknownError'), variant: 'destructive' });
    }
  };

  // Only active coupons are shown - deactivated ones leave the panel.
  const activeCoupons = coupons.filter((c) => c.active);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('admin.createCoupon')}</CardTitle>
          <CardDescription>{t('admin.createCouponDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>{t('admin.couponCodeLabel')}</Label>
              <Input placeholder="PROMO2026" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
            </div>
            <div className="space-y-2">
              <Label>{t('admin.couponPercent')}</Label>
              <Input type="number" min={1} max={100} placeholder="100" value={percentOff} onChange={(e) => setPercentOff(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('admin.couponMaxRedemptions')}</Label>
              <Input type="number" min={1} placeholder="25" value={maxRedemptions} onChange={(e) => setMaxRedemptions(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('admin.couponExpiresDays')}</Label>
              <Input type="number" min={1} placeholder="30" value={expiresDays} onChange={(e) => setExpiresDays(e.target.value)} />
            </div>
          </div>
          <Button className="mt-4" onClick={create} disabled={creating || !code.trim() || !percentOff}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Ticket className="h-4 w-4 mr-1" />}
            {t('admin.couponCreateButton')}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('admin.couponsExisting')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : activeCoupons.length === 0 ? (
            <EmptyState
              icon={Ticket}
              title={t('admin.emptyCoupons')}
              description={t('admin.emptyCouponsDesc')}
              className="py-8"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.couponCodeLabel')}</TableHead>
                    <TableHead>{t('admin.couponDiscount')}</TableHead>
                    <TableHead>{t('admin.couponRedemptions')}</TableHead>
                    <TableHead>{t('admin.couponExpires')}</TableHead>
                    <TableHead className="text-right">{t('admin.couponAction')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeCoupons.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono font-medium">{c.code}</TableCell>
                      <TableCell>{c.percent_off != null ? `${c.percent_off}%` : ''}</TableCell>
                      <TableCell>{c.times_redeemed}{c.max_redemptions ? `/${c.max_redemptions}` : ''}</TableCell>
                      <TableCell>{c.expires_at ? new Date(c.expires_at * 1000).toLocaleDateString() : ''}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => deactivate(c.id)}>
                          {t('admin.couponDeactivate')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MessagesTab() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [messages, setMessages] = useState<adminApi.AdminContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<adminApi.AdminContactMessage | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setMessages(await adminApi.adminListContactMessages());
    } catch (e) {
      toast({ title: t('common.error'), description: e instanceof Error ? e.message : t('common.unknownError'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const unreadCount = messages.filter((m) => !m.is_read).length;

  const openMessage = async (m: adminApi.AdminContactMessage) => {
    setSelected(m);
    if (!m.is_read) {
      try {
        await adminApi.adminToggleContactMessageRead(m.id, true);
        setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, is_read: true } : x)));
      } catch {
        // non-blocking: read state is cosmetic
      }
    }
  };

  const toggleRead = async (m: adminApi.AdminContactMessage) => {
    const next = !m.is_read;
    try {
      await adminApi.adminToggleContactMessageRead(m.id, next);
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, is_read: next } : x)));
      if (selected?.id === m.id) setSelected({ ...selected, is_read: next });
    } catch (e) {
      toast({ title: t('common.error'), description: e instanceof Error ? e.message : t('common.unknownError'), variant: 'destructive' });
    }
  };

  const remove = async (id: string) => {
    try {
      await adminApi.adminDeleteContactMessage(id);
      setMessages((prev) => prev.filter((x) => x.id !== id));
      if (selected?.id === id) setSelected(null);
      toast({ title: t('admin.messageDeleted') });
    } catch (e) {
      toast({ title: t('common.error'), description: e instanceof Error ? e.message : t('common.unknownError'), variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('admin.messagesTitle')}</CardTitle>
        <CardDescription>
          {messages.length > 0
            ? t('admin.messagesSummary', { n: messages.length, m: unreadCount })
            : t('admin.messagesLandingHint')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title={t('admin.messagesEmptyTitle')}
            description={t('admin.messagesEmptyDesc')}
            className="py-8"
          />
        ) : (
          <div className="space-y-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col gap-2 rounded-xl border p-4 transition-colors sm:flex-row sm:items-center ${
                  m.is_read ? 'border-border/60 bg-card' : 'border-primary/40 bg-primary/5'
                }`}
              >
                <button
                  type="button"
                  onClick={() => openMessage(m)}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className="flex items-center gap-2">
                    {!m.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                    <span className="font-medium truncate">{m.name}</span>
                    <span className="text-muted-foreground text-sm truncate">{m.email}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{m.message}</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    {new Date(m.created_at).toLocaleString()}
                  </p>
                </button>
                <div className="flex shrink-0 gap-2 sm:pl-4">
                  <Button variant="outline" size="sm" onClick={() => toggleRead(m)}>
                    {m.is_read ? t('admin.markUnread') : t('admin.markRead')}
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => remove(m.id)}>
                    {t('admin.delete')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('admin.messageFrom', { name: selected?.name ?? '' })}</DialogTitle>
            </DialogHeader>
            {selected && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <a href={`mailto:${selected.email}`} className="text-primary hover:underline">
                    {selected.email}
                  </a>
                  <Badge variant={selected.is_read ? 'secondary' : 'default'}>
                    {selected.is_read ? t('admin.read') : t('admin.unread')}
                  </Badge>
                  <span className="text-muted-foreground">
                    {new Date(selected.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="whitespace-pre-wrap rounded-lg bg-muted/50 p-4 text-sm leading-relaxed">
                  {selected.message}
                </p>
              </div>
            )}
            <DialogFooter className="flex justify-between sm:justify-between">
              <Button
                variant="destructive"
                onClick={() => selected && remove(selected.id)}
                disabled={!selected}
              >
                {t('admin.delete')}
              </Button>
              <Button variant="outline" onClick={() => setSelected(null)}>
                {t('admin.close')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
