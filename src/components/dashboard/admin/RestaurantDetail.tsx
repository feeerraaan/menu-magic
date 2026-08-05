import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Plus, Trash2, Pencil, ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useToast } from '@/hooks/use-toast';
import * as adminApi from '@/lib/admin-api';

const CURRENCIES = ['EUR', 'USD', 'GBP', 'MXN'];
const THEMES = ['light', 'dark'];
const LANGUAGES = ['es', 'en', 'ca', 'fr', 'de', 'it', 'pt'];

interface RestaurantDetailProps {
  restaurantId: string;
  restaurantName: string;
  onClose: () => void;
  onChanged: () => void;
}

interface MenuForm {
  id?: string;
  name: string;
  description: string;
  is_active: boolean;
}

export function RestaurantDetail({ restaurantId, restaurantName, onClose, onChanged }: RestaurantDetailProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [snapshot, setSnapshot] = useState<adminApi.AdminRestaurantSnapshot | null>(null);
  const [menus, setMenus] = useState<adminApi.AdminMenuRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [config, setConfig] = useState<Record<string, string | boolean | string[] | null>>({});
  const [subPlan, setSubPlan] = useState('free');
  const [subPhotos, setSubPhotos] = useState(0);
  const [subLanguages, setSubLanguages] = useState(1);

  const [menuForm, setMenuForm] = useState<MenuForm | null>(null);
  const [menuFormOpen, setMenuFormOpen] = useState(false);
  const [savingMenu, setSavingMenu] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());
  const [menuDetails, setMenuDetails] = useState<Record<string, adminApi.AdminMenuDetails>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await adminApi.adminGetRestaurant(restaurantId);
      setSnapshot(snap);
      if (snap?.restaurant) {
        const r = snap.restaurant;
        setConfig({
          name: r.name ?? '',
          address: r.address ?? '',
          phone: r.phone ?? '',
          currency: r.currency ?? 'EUR',
          default_language: r.default_language ?? 'es',
          supported_languages: Array.isArray(r.supported_languages) ? r.supported_languages.join(', ') : 'es',
          hide_prices: !!r.hide_prices,
          theme: r.theme ?? 'light',
          is_published: !!r.is_published,
          logo_url: r.logo_url ?? '',
        });
      }
      if (snap?.subscription) {
        setSubPlan(snap.subscription.plan ?? 'free');
        setSubPhotos(snap.subscription.photos_limit ?? 0);
        setSubLanguages(snap.subscription.languages_limit ?? 1);
      }
      setMenus(await adminApi.adminListMenus(restaurantId));
    } catch (e) {
      toast({ title: t('common.error'), description: e instanceof Error ? e.message : t('common.unknownError'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [restaurantId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const setC = (key: string, value: string | boolean) => setConfig((p) => ({ ...p, [key]: value }));

  const saveConfig = async () => {
    setSaving(true);
    try {
      await adminApi.adminUpdateRestaurantConfig(restaurantId, {
        name: String(config.name ?? ''),
        address: String(config.address ?? '').trim() || null,
        phone: String(config.phone ?? '').trim() || null,
        currency: String(config.currency ?? 'EUR'),
        default_language: String(config.default_language ?? 'es'),
        supported_languages: String(config.supported_languages ?? 'es').split(',').map((s) => s.trim()).filter(Boolean),
        hide_prices: !!config.hide_prices,
        theme: String(config.theme ?? 'light'),
        is_published: !!config.is_published,
        logo_url: String(config.logo_url ?? '').trim() || null,
      });
      await adminApi.adminUpdateSubscription(restaurantId, subPlan, subPhotos, subLanguages);
      toast({ title: t('admin.saved'), description: t('admin.configUpdated') });
      onChanged();
      await load();
    } catch (e) {
      toast({ title: t('common.error'), description: e instanceof Error ? e.message : t('common.unknownError'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const openCreateMenu = () => {
    setMenuForm({ name: '', description: '', is_active: true });
    setMenuFormOpen(true);
  };

  const openEditMenu = (menu: adminApi.AdminMenuRow) => {
    setMenuForm({ id: menu.menu_id, name: menu.name, description: menu.description ?? '', is_active: menu.is_active });
    setMenuFormOpen(true);
  };

  const saveMenu = async () => {
    if (!menuForm) return;
    setSavingMenu(true);
    try {
      if (menuForm.id) {
        await adminApi.adminUpdateMenu(menuForm.id, menuForm.name, menuForm.description.trim() || null, menuForm.is_active);
      } else {
        await adminApi.adminCreateMenu(restaurantId, menuForm.name, menuForm.is_active);
      }
      toast({ title: t('admin.menuSaved') });
      setMenuFormOpen(false);
      setMenuForm(null);
      await load();
    } catch (e) {
      toast({ title: t('common.error'), description: e instanceof Error ? e.message : t('common.unknownError'), variant: 'destructive' });
    } finally {
      setSavingMenu(false);
    }
  };

  const deleteMenu = async (menuId: string) => {
    if (!window.confirm(t('admin.confirmDeleteMenu'))) return;
    try {
      await adminApi.adminDeleteMenu(menuId);
      toast({ title: t('admin.menuDeleted') });
      await load();
    } catch (e) {
      toast({ title: t('common.error'), description: e instanceof Error ? e.message : t('common.unknownError'), variant: 'destructive' });
    }
  };

  const toggleMenuExpand = async (menuId: string) => {
    setExpandedMenus((prev) => {
      const next = new Set(prev);
      if (next.has(menuId)) next.delete(menuId);
      else {
        next.add(menuId);
        if (!menuDetails[menuId]) {
          adminApi.adminGetMenuDetails(menuId).then((d) => {
            if (d) setMenuDetails((p) => ({ ...p, [menuId]: d }));
          }).catch(() => {});
        }
      }
      return next;
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Restaurante: {restaurantName}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Configuración */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Configuración del restaurante</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nombre</Label>
                    <Input value={String(config.name ?? '')} onChange={(e) => setC('name', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input value={String(config.phone ?? '')} onChange={(e) => setC('phone', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Dirección</Label>
                    <Input value={String(config.address ?? '')} onChange={(e) => setC('address', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Logo URL</Label>
                    <Input value={String(config.logo_url ?? '')} onChange={(e) => setC('logo_url', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Moneda</Label>
                    <Select value={String(config.currency ?? 'EUR')} onValueChange={(v) => setC('currency', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Idioma por defecto</Label>
                    <Select value={String(config.default_language ?? 'es')} onValueChange={(v) => setC('default_language', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Idiomas soportados (separados por coma)</Label>
                    <Input value={String(config.supported_languages ?? 'es')} onChange={(e) => setC('supported_languages', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tema</Label>
                    <Select value={String(config.theme ?? 'light')} onValueChange={(v) => setC('theme', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {THEMES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="cfg-published">Menú publicado</Label>
                    <Switch id="cfg-published" checked={!!config.is_published} onCheckedChange={(v) => setC('is_published', v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="cfg-hideprices">Ocultar precios</Label>
                    <Switch id="cfg-hideprices" checked={!!config.hide_prices} onCheckedChange={(v) => setC('hide_prices', v)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Suscripción */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Suscripción</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Plan</Label>
                    <Select value={subPlan} onValueChange={setSubPlan}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Sargantana (free)</SelectItem>
                        <SelectItem value="pro_monthly">Ferreret (mensual)</SelectItem>
                        <SelectItem value="pro_annual">Ferreret (anual)</SelectItem>
                        <SelectItem value="lifetime">Myotragus (lifetime)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Fotos</Label>
                    <Input type="number" min={0} value={subPhotos} onChange={(e) => setSubPhotos(Number(e.target.value) || 0)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Idiomas</Label>
                    <Input type="number" min={1} value={subLanguages} onChange={(e) => setSubLanguages(Number(e.target.value) || 1)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Menús */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Menús</CardTitle>
                  <Button size="sm" variant="outline" onClick={openCreateMenu}>
                    <Plus className="h-4 w-4 mr-1" /> Nuevo menú
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {menus.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin menús.</p>
                ) : (
                  menus.map((menu) => (
                    <div key={menu.menu_id} className="border rounded-lg">
                      <div className="flex items-center gap-2 p-3">
                        <button type="button" onClick={() => toggleMenuExpand(menu.menu_id)} className="p-1">
                          {expandedMenus.has(menu.menu_id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {menu.name}{' '}
                            {!menu.is_active && <Badge variant="secondary" className="ml-1">oculto</Badge>}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {menu.category_count} categorías · {menu.item_count} platos
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => openEditMenu(menu)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMenu(menu.menu_id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      {expandedMenus.has(menu.menu_id) && (
                        <div className="px-4 pb-3 space-y-2 border-t">
                          <MenuTree menuId={menu.menu_id} details={menuDetails[menu.menu_id]} />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cerrar</Button>
              <Button onClick={saveConfig} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Guardar cambios
              </Button>
            </DialogFooter>
          </div>
        )}

        <Dialog open={menuFormOpen} onOpenChange={(o) => !o && setMenuFormOpen(false)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{menuForm?.id ? 'Editar menú' : 'Nuevo menú'}</DialogTitle>
            </DialogHeader>
            {menuForm && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input value={menuForm.name} onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Input value={menuForm.description} onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="menu-active">Activo</Label>
                  <Switch id="menu-active" checked={menuForm.is_active} onCheckedChange={(v) => setMenuForm({ ...menuForm, is_active: v })} />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setMenuFormOpen(false)}>Cancelar</Button>
              <Button onClick={saveMenu} disabled={savingMenu || !menuForm?.name.trim()}>
                {savingMenu && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

function MenuTree({ menuId, details }: { menuId: string; details?: adminApi.AdminMenuDetails }) {
  if (!details) {
    return <p className="text-xs text-muted-foreground py-2">Cargando…</p>;
  }
  if (details.categories.length === 0) {
    return <p className="text-xs text-muted-foreground py-2">Sin categorías.</p>;
  }
  return (
    <div className="py-2 space-y-2">
      {details.categories.map(({ category, items }) => (
        <div key={category.id} className="space-y-1">
          <p className="text-sm font-medium">{category.name}</p>
          <ul className="pl-4 space-y-0.5">
            {items.map((item) => (
              <li key={item.id} className="text-sm text-muted-foreground flex justify-between gap-3">
                <span className="truncate">{item.name}</span>
                <span className="shrink-0">{item.price != null ? `${item.price} ${config.currency}` : ''}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
