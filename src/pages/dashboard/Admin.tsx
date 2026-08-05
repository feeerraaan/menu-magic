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
import { Loader2, ShieldCheck, Users, Ticket } from 'lucide-react';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useToast } from '@/hooks/use-toast';
import * as adminApi from '@/lib/admin-api';
import { PLAN_LIMITS } from '@/lib/subscription-limits';
import { RestaurantDetail } from '@/components/dashboard/admin/RestaurantDetail';

const PLAN_NAMES: Record<string, string> = {
  free: 'Sargantana',
  pro_monthly: 'Ferreret',
  pro_annual: 'Ferreret anual',
  lifetime: 'Myotragus',
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
        <h2 className="font-display text-2xl font-bold">Acceso restringido</h2>
        <p className="text-muted-foreground">Esta sección es solo para administradores.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold">Backoffice</h2>
        <p className="text-muted-foreground">Superadmin: usuarios, restaurantes y cupones de descuento.</p>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users" className="gap-1.5">
            <Users className="h-4 w-4" /> Usuarios
          </TabsTrigger>
          <TabsTrigger value="coupons" className="gap-1.5">
            <Ticket className="h-4 w-4" /> Cupones
          </TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
        <TabsContent value="coupons">
          <CouponsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function UsersTab() {
  const { toast } = useToast();
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
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Error desconocido', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

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
      toast({ title: 'Guardado', description: 'Cambios aplicados al restaurante.' });
      setEditing(null);
      await load();
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Error desconocido', variant: 'destructive' });
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
        <CardTitle className="text-lg">Usuarios y restaurantes</CardTitle>
        <CardDescription>{rows.length} usuarios registrados.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Restaurante</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Límites</TableHead>
                <TableHead>Publicado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.user_id}>
                  <TableCell className="font-medium">{row.email}</TableCell>
                  <TableCell>{row.restaurant_name ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={row.plan === 'free' ? 'secondary' : 'default'}>
                      {PLAN_NAMES[row.plan ?? 'free'] ?? row.plan}
                    </Badge>
                  </TableCell>
                  <TableCell>{row.subscription_status ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {row.photos_limit ?? 0} fotos · {row.languages_limit ?? 1} idiomas
                  </TableCell>
                  <TableCell>{row.is_published ? 'Sí' : 'No'}</TableCell>
                  <TableCell className="text-right">
                    {row.restaurant_id && (
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setDetail(row)}>
                          Ver
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openEdit(row)}>
                          Editar
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
              <DialogTitle>Editar restaurante</DialogTitle>
            </DialogHeader>
            {editing && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Plan</Label>
                  <Select value={editing.plan} onValueChange={(v) => setEditing({ ...editing, plan: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Sargantana (free)</SelectItem>
                      <SelectItem value="pro_monthly">Ferreret (mensual)</SelectItem>
                      <SelectItem value="pro_annual">Ferreret (anual)</SelectItem>
                      <SelectItem value="lifetime">Myotragus (lifetime)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fotos</Label>
                    <Input
                      type="number"
                      min={0}
                      value={editing.photos_limit}
                      onChange={(e) => setEditing({ ...editing, photos_limit: Number(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Idiomas</Label>
                    <Input
                      type="number"
                      min={1}
                      value={editing.languages_limit}
                      onChange={(e) => setEditing({ ...editing, languages_limit: Number(e.target.value) || 1 })}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="published">Menú publicado</Label>
                  <Switch
                    id="published"
                    checked={editing.is_published}
                    onCheckedChange={(v) => setEditing({ ...editing, is_published: v })}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Guardar
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
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Error desconocido', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

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
      toast({ title: 'Cupón creado', description: `Código ${result.code} (${result.percent_off}%)` });
      setCode('');
      setPercentOff('');
      setMaxRedemptions('');
      setExpiresDays('');
      await load();
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Error desconocido', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const deactivate = async (id: string) => {
    try {
      await adminApi.adminDeactivateCoupon(id);
      toast({ title: 'Cupón desactivado' });
      await load();
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Error desconocido', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Crear cupón de descuento</CardTitle>
          <CardDescription>Genera un código de promoción del X% en Stripe (pago único, una compra).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Código</Label>
              <Input placeholder="PROMO2026" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
            </div>
            <div className="space-y-2">
              <Label>% descuento</Label>
              <Input type="number" min={1} max={100} placeholder="100" value={percentOff} onChange={(e) => setPercentOff(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Canjes máx. (opcional)</Label>
              <Input type="number" min={1} placeholder="25" value={maxRedemptions} onChange={(e) => setMaxRedemptions(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Caduca en días (opcional)</Label>
              <Input type="number" min={1} placeholder="30" value={expiresDays} onChange={(e) => setExpiresDays(e.target.value)} />
            </div>
          </div>
          <Button className="mt-4" onClick={create} disabled={creating || !code.trim() || !percentOff}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Ticket className="h-4 w-4 mr-1" />}
            Crear cupón
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cupones existentes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : coupons.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay cupones.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Descuento</TableHead>
                    <TableHead>Canjes</TableHead>
                    <TableHead>Caduca</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono font-medium">{c.code}</TableCell>
                      <TableCell>{c.percent_off != null ? `${c.percent_off}%` : '—'}</TableCell>
                      <TableCell>{c.times_redeemed}{c.max_redemptions ? `/${c.max_redemptions}` : ''}</TableCell>
                      <TableCell>{c.expires_at ? new Date(c.expires_at * 1000).toLocaleDateString() : '—'}</TableCell>
                      <TableCell>
                        <Badge variant={c.active ? 'default' : 'secondary'}>{c.active ? 'Activo' : 'Desactivado'}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {c.active && (
                          <Button variant="outline" size="sm" onClick={() => deactivate(c.id)}>
                            Desactivar
                          </Button>
                        )}
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
