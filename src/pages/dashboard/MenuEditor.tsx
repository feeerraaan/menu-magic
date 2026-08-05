import { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Restaurant, Category, Item, Menu, ScheduleRule } from '@/types/database';
import { assertWithinLimits } from '@/lib/api';
import { useMenus, useCategories, useItems } from '@/hooks/useRestaurant';
import { useSubscriptionContext } from '@/contexts/SubscriptionContext';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { MenuScheduleEditor } from '@/components/dashboard/MenuScheduleEditor';
import { UpgradeBanner, LimitIndicator } from '@/components/subscription';
import { CategoryDialogWithTranslations } from '@/components/dashboard/CategoryDialogWithTranslations';
import { ItemDialogWithTranslations } from '@/components/dashboard/ItemDialogWithTranslations';
import { AiImportDialog } from '@/components/dashboard/AiImportDialog';
import { AiWelcomeSequence } from '@/components/dashboard/AiWelcomeSequence';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Plus, 
  GripVertical, 
  Trash2, 
  Edit2, 
  Copy, 
  ChevronDown, 
  ChevronRight,
  Leaf,
  Flame,
  Wheat,
  Eye,
  EyeOff,
  Star,
  Loader2,
  Image as ImageIcon,
  Clock,
  AlertTriangle,
  Crown,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImageUpload } from '@/components/ui/image-upload';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { supabase } from '@/integrations/supabase/client';

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
}

function SortableItem({ id, children }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={cn('relative', isDragging && 'z-50 opacity-90')}
    >
      <div {...attributes} {...listeners} className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground">
        <GripVertical className="h-4 w-4" />
      </div>
      {children}
    </div>
  );
}

interface CategoryCardProps {
  category: Category;
  items: Item[];
  canAddItem: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onAddItem: () => void;
  onEditItem: (item: Item) => void;
  onDeleteItem: (id: string) => void;
  onDuplicateItem: (item: Item) => void;
  onToggleItemActive: (item: Item) => void;
  onReorderItems: (items: Item[]) => void;
  expanded: boolean;
  onToggleExpand: () => void;
}

function CategoryCard({ 
  category, 
  items,
  canAddItem,
  onEdit, 
  onDelete, 
  onAddItem, 
  onEditItem,
  onDeleteItem,
  onDuplicateItem,
  onToggleItemActive,
  onReorderItems,
  expanded,
  onToggleExpand,
}: CategoryCardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex(i => i.id === active.id);
      const newIndex = items.findIndex(i => i.id === over.id);
      onReorderItems(arrayMove(items, oldIndex, newIndex));
    }
  };

  return (
    <Card className={cn('transition-all', !category.is_active && 'opacity-60')}>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between pl-6">
          <button 
            onClick={onToggleExpand}
            className="flex items-center gap-2 text-left hover:text-primary transition-colors"
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <CardTitle className="text-base font-semibold">{category.name}</CardTitle>
            <span className="text-sm text-muted-foreground">({items.length} {t('menuEditor.items')})</span>
          </button>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {expanded && (
        <CardContent className="pt-0 pb-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2 ml-6">
                {items.map(item => (
                  <SortableItem key={item.id} id={item.id}>
                    <div className={cn(
                      'flex items-center gap-3 p-3 pl-8 rounded-lg border bg-card hover:border-primary/30 transition-colors overflow-hidden',
                      !item.is_active && 'opacity-50'
                    )}>
                      {item.photo_url && (
                        <img src={item.photo_url} alt={item.name} className="h-12 w-12 rounded object-cover flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{item.name}</span>
                          {item.is_featured && <Star className="h-3 w-3 text-warning fill-warning flex-shrink-0" />}
                          {item.is_vegetarian && <Leaf className="h-3 w-3 text-green-600 flex-shrink-0" />}
                          {item.is_vegan && <Leaf className="h-3 w-3 text-green-700 fill-green-700 flex-shrink-0" />}
                          {item.is_spicy && <Flame className="h-3 w-3 text-red-500 flex-shrink-0" />}
                          {item.is_gluten_free && <Wheat className="h-3 w-3 text-amber-600 line-through flex-shrink-0" />}
                        </div>
                        {item.description && (
                          <p className="text-sm text-muted-foreground truncate max-w-[300px]">{item.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {item.price !== null && (
                          <span className="font-semibold text-primary whitespace-nowrap">{item.price.toFixed(2)}</span>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => onToggleItemActive(item)}>
                          {item.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onDuplicateItem(item)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onEditItem(item)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onDeleteItem(item.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </SortableItem>
                ))}
                <Button 
                  variant="outline" 
                  className="w-full mt-2" 
                  onClick={onAddItem}
                  disabled={!canAddItem}
                >
                  <Plus className="mr-2 h-4 w-4" /> {t('menuEditor.addItem')}
                  {!canAddItem && <Crown className="ml-2 h-3 w-3 text-warning" />}
                </Button>
              </div>
            </SortableContext>
          </DndContext>
        </CardContent>
      )}
    </Card>
  );
}

export default function MenuEditor() {
  const { restaurant } = useOutletContext<{ restaurant: Restaurant }>();
  const { menus, loading: menusLoading, refetch: refetchMenus } = useMenus(restaurant.id);
  const { subscription, plan: currentPlan, limits: planLimits, isPremium } = useSubscriptionContext();
  const { t } = useTranslation();
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const { categories, create: createCategory, update: updateCategory, remove: removeCategory, reorder: reorderCategories, setCategories } = useCategories(selectedMenuId || undefined);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [itemsByCategory, setItemsByCategory] = useState<Record<string, Item[]>>({});
  
  // Dialogs
  const [categoryDialog, setCategoryDialog] = useState<{ open: boolean; category?: Category }>({ open: false });
  const [itemDialog, setItemDialog] = useState<{ open: boolean; item?: Item; categoryId?: string }>({ open: false });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; type: 'category' | 'item' | 'menu'; id: string } | null>(null);
  const [menuDialog, setMenuDialog] = useState<{ open: boolean; menu?: Menu }>({ open: false });
  const [aiImportOpen, setAiImportOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  
  const { toast } = useToast();
  
  // Count photos across all items
  const totalPhotos = useMemo(() => {
    return Object.values(itemsByCategory)
      .flat()
      .filter(item => item.photo_url)
      .length;
  }, [itemsByCategory]);

  // Count total items across all categories
  const totalItems = useMemo(() => {
    return Object.values(itemsByCategory).flat().length;
  }, [itemsByCategory]);

  // Limit checks
  const canCreateMenu = menus.length < planLimits.menus;
  const canCreateCategory = categories.length < planLimits.categories;
  const canCreateItem = totalItems < planLimits.items;
  const canAddPhoto = totalPhotos < planLimits.photos;
  const canUseSchedules = planLimits.schedules;

  // Set initial menu
  useEffect(() => {
    if (menus.length > 0 && !selectedMenuId) {
      setSelectedMenuId(menus[0].id);
    }
  }, [menus, selectedMenuId]);

  // Fetch items for all categories (with translations)
  useEffect(() => {
    const fetchItems = async () => {
      if (!categories.length) {
        setItemsByCategory({});
        return;
      }
      try {
        const items: Record<string, Item[]> = {};
        for (const cat of categories) {
          const { data, error } = await supabase
            .from('items')
            .select('*, item_translations(*)')
            .eq('category_id', cat.id)
            .order('display_order');
          
          if (error) {
            if (import.meta.env.DEV) {
              console.error('Error fetching items for category', cat.id, error);
            }
          }
          items[cat.id] = (data || []).map(item => ({
            ...item,
            translations: item.item_translations,
          })) as Item[];
        }
        setItemsByCategory(items);
      } catch (e) {
        if (import.meta.env.DEV) {
          console.error('Error fetching items:', e);
        }
      }
    };
    fetchItems();
  }, [categories]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleCategoryDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = categories.findIndex(c => c.id === active.id);
      const newIndex = categories.findIndex(c => c.id === over.id);
      reorderCategories(arrayMove(categories, oldIndex, newIndex));
    }
  };

  const handleSaveCategory = async (name: string, description?: string, category?: Category) => {
    try {
      if (category) {
        await updateCategory(category.id, { name, description: description || null });
        toast({ title: t('menuEditor.categoryUpdated') });
      } else {
        await assertWithinLimits(restaurant.id, { categories: 1 });
        await createCategory(name);
        toast({ title: t('menuEditor.categoryCreated') });
      }
      setCategoryDialog({ open: false });
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : t('common.unknownError');
      toast({ title: t('common.error'), description: errorMsg, variant: 'destructive' });
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await removeCategory(id);
      toast({ title: t('menuEditor.categoryDeleted') });
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : t('common.unknownError');
      toast({ title: t('common.error'), description: errorMsg, variant: 'destructive' });
    }
    setDeleteConfirm(null);
  };

  const handleSaveItem = async (data: Partial<Item>, item?: Item, categoryId?: string) => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      if (item) {
        await supabase.from('items').update(data).eq('id', item.id);
        setItemsByCategory(prev => ({
          ...prev,
          [item.category_id]: prev[item.category_id].map(i => i.id === item.id ? { ...i, ...data } : i),
        }));
        toast({ title: t('menuEditor.itemUpdated') });
      } else if (categoryId) {
        await assertWithinLimits(restaurant.id, { items: 1 });
        const insertData = {
          category_id: categoryId,
          name: data.name || 'New Item',
          description: data.description ?? null,
          price: data.price ?? null,
          photo_url: data.photo_url ?? null,
          is_active: data.is_active ?? true,
          is_featured: data.is_featured ?? false,
          is_vegetarian: data.is_vegetarian ?? false,
          is_vegan: data.is_vegan ?? false,
          is_spicy: data.is_spicy ?? false,
          is_gluten_free: data.is_gluten_free ?? false,
          allergens: data.allergens ?? [],
          display_order: itemsByCategory[categoryId]?.length || 0,
        };
        const { data: newItem } = await supabase
          .from('items')
          .insert([insertData])
          .select()
          .single();
        if (newItem) {
          setItemsByCategory(prev => ({
            ...prev,
            [categoryId]: [...(prev[categoryId] || []), newItem as Item],
          }));
        }
        toast({ title: t('menuEditor.itemCreated') });
      }
      setItemDialog({ open: false });
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : t('common.unknownError');
      toast({ title: t('common.error'), description: errorMsg, variant: 'destructive' });
    }
  };

  const handleDeleteItem = async (id: string, categoryId: string) => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      await supabase.from('items').delete().eq('id', id);
      setItemsByCategory(prev => ({
        ...prev,
        [categoryId]: prev[categoryId].filter(i => i.id !== id),
      }));
      toast({ title: t('menuEditor.itemDeleted') });
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : t('common.unknownError');
      toast({ title: t('common.error'), description: errorMsg, variant: 'destructive' });
    }
    setDeleteConfirm(null);
  };

  const handleDuplicateItem = async (item: Item) => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const insertData = {
        category_id: item.category_id,
        name: `${item.name} (copy)`,
        description: item.description,
        price: item.price,
        is_active: item.is_active,
        is_featured: item.is_featured,
        is_vegetarian: item.is_vegetarian,
        is_vegan: item.is_vegan,
        is_spicy: item.is_spicy,
        is_gluten_free: item.is_gluten_free,
        allergens: item.allergens,
        display_order: (itemsByCategory[item.category_id]?.length || 0),
      };
      const { data: newItem } = await supabase
        .from('items')
        .insert([insertData])
        .select()
        .single();
      if (newItem) {
        setItemsByCategory(prev => ({
          ...prev,
          [item.category_id]: [...(prev[item.category_id] || []), newItem as Item],
        }));
        toast({ title: t('menuEditor.itemDuplicated') });
      }
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : t('common.unknownError');
      toast({ title: t('common.error'), description: errorMsg, variant: 'destructive' });
    }
  };

  const handleToggleItemActive = async (item: Item) => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      await supabase.from('items').update({ is_active: !item.is_active }).eq('id', item.id);
      setItemsByCategory(prev => ({
        ...prev,
        [item.category_id]: prev[item.category_id].map(i => 
          i.id === item.id ? { ...i, is_active: !item.is_active } : i
        ),
      }));
    } catch (e: any) {
      toast({ title: t('common.error'), description: e.message, variant: 'destructive' });
    }
  };

  const handleReorderItems = async (categoryId: string, newItems: Item[]) => {
    setItemsByCategory(prev => ({ ...prev, [categoryId]: newItems }));
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      for (let i = 0; i < newItems.length; i++) {
        await supabase.from('items').update({ display_order: i }).eq('id', newItems[i].id);
      }
    } catch (e: any) {
      toast({ title: t('menuEditor.errorSavingOrder'), variant: 'destructive' });
    }
  };

  const toggleCategoryExpand = (id: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (menusLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Plan Limits Overview */}
      {!isPremium && (
        <UpgradeBanner 
          message={t('menuEditor.unlockFeatures')}
          variant="compact"
        />
      )}

      {/* Limit Indicators */}
      <Card className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <LimitIndicator 
            feature="menus" 
            current={menus.length} 
            limit={planLimits.menus}
            size="sm"
          />
          <LimitIndicator 
            feature="categories" 
            current={categories.length} 
            limit={planLimits.categories}
            size="sm"
          />
          <LimitIndicator 
            feature="items" 
            current={totalItems} 
            limit={planLimits.items}
            size="sm"
          />
          <LimitIndicator 
            feature="photos" 
            current={totalPhotos} 
            limit={planLimits.photos}
            size="sm"
          />
        </div>
      </Card>

      {/* Menu Selection Bar */}
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium">{t('menuEditor.menuLabel')}:</Label>
            <Select value={selectedMenuId || ''} onValueChange={setSelectedMenuId}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder={t('menuEditor.selectMenu')} />
              </SelectTrigger>
              <SelectContent>
                {menus.map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    <span className="flex items-center gap-2">
                      {m.name}
                      {m.is_active && (
                        <Badge variant="default" className="text-xs px-1.5 py-0">{t('menuEditor.active')}</Badge>
                      )}
                      {m.schedule_rules && canUseSchedules && (
                        <Clock className="h-3 w-3 text-muted-foreground" />
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => {
                const menu = menus.find(m => m.id === selectedMenuId);
                if (menu) setMenuDialog({ open: true, menu });
              }}
              title={t('menuEditor.editMenu')}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            {menus.length > 1 && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => {
                  if (selectedMenuId) {
                    setDeleteConfirm({ open: true, type: 'menu', id: selectedMenuId });
                  }
                }}
                title={t('menuEditor.deleteMenu')}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!canCreateMenu && (
              <Badge variant="outline" className="text-xs gap-1 border-warning/30">
                <Crown className="h-3 w-3 text-warning" />
                {t('menuEditor.limitReached')}
              </Badge>
            )}
            <Button 
              variant="outline"
              onClick={() => {
                if (!canCreateMenu) {
                  toast({ 
                    title: t('menuEditor.menuLimitReached'), 
                    description: t('menuEditor.menuLimitDescription'),
                    variant: 'destructive'
                  });
                  return;
                }
                setMenuDialog({ open: true });
              }}
              disabled={!canCreateMenu}
            >
              <Plus className="mr-2 h-4 w-4" /> {t('menuEditor.newMenu')}
            </Button>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold flex items-center gap-2">
            {menus.find(m => m.id === selectedMenuId)?.name || t('menuEditor.editorFallback')}
            {menus.find(m => m.id === selectedMenuId)?.is_active && (
              <Badge variant="default">{t('menuEditor.active')}</Badge>
            )}
          </h2>
          <p className="text-muted-foreground">{t('menuEditor.manageDescription')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setAiImportOpen(true)} className="gap-2">
            <Sparkles className="h-4 w-4" /> {t('menuEditor.importWithAI')}
          </Button>
          <Button
            onClick={() => {
              if (!canCreateCategory) {
                toast({
                  title: t('menuEditor.categoryLimitReached'),
                  description: t('menuEditor.categoryLimitDescription'),
                  variant: 'destructive'
                });
                return;
              }
              setCategoryDialog({ open: true });
            }}
            disabled={!canCreateCategory}
          >
            <Plus className="mr-2 h-4 w-4" /> {t('menuEditor.addCategory')}
          </Button>
        </div>
      </div>

      {categories.length === 0 ? (
        <Card>
          <EmptyState
            icon={Sparkles}
            title={t('menuEditor.emptyCategoriesTitle')}
            description={t('menuEditor.emptyCategoriesDesc')}
            action={
              <>
                <Button onClick={() => setAiImportOpen(true)} className="gap-2">
                  <Sparkles className="h-4 w-4" /> {t('menuEditor.importWithAI')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCategoryDialog({ open: true })}
                  disabled={!canCreateCategory}
                >
                  <Plus className="mr-2 h-4 w-4" /> {t('menuEditor.addCategory')}
                </Button>
              </>
            }
          />
        </Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCategoryDragEnd}>
          <SortableContext items={categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {categories.map(category => (
                <SortableItem key={category.id} id={category.id}>
                  <CategoryCard
                    category={category}
                    items={itemsByCategory[category.id] || []}
                    canAddItem={canCreateItem}
                    expanded={expandedCategories.has(category.id)}
                    onToggleExpand={() => toggleCategoryExpand(category.id)}
                    onEdit={() => setCategoryDialog({ open: true, category })}
                    onDelete={() => setDeleteConfirm({ open: true, type: 'category', id: category.id })}
                    onAddItem={() => setItemDialog({ open: true, categoryId: category.id })}
                    onEditItem={(item) => setItemDialog({ open: true, item, categoryId: category.id })}
                    onDeleteItem={(id) => setDeleteConfirm({ open: true, type: 'item', id })}
                    onDuplicateItem={handleDuplicateItem}
                    onToggleItemActive={handleToggleItemActive}
                    onReorderItems={(items) => handleReorderItems(category.id, items)}
                  />
                </SortableItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* AI Import Dialog */}
      <AiImportDialog
        open={aiImportOpen}
        restaurantId={restaurant.id}
        onClose={() => setAiImportOpen(false)}
        onImported={() => {
          setAiImportOpen(false);
          setShowWelcome(true);
        }}
      />

      <AiWelcomeSequence
        open={showWelcome}
        onDone={() => {
          setShowWelcome(false);
          refetchMenus();
        }}
      />

      {/* Category Dialog */}
      <CategoryDialogWithTranslations
        open={categoryDialog.open}
        category={categoryDialog.category}
        supportedLanguages={restaurant.supported_languages}
        defaultLanguage={restaurant.default_language}
        restaurantId={restaurant.id}
        menuId={selectedMenuId || ''}
        onClose={() => setCategoryDialog({ open: false })}
        onSave={async () => {
          // Refetch categories to get updated translations
          const { data } = await supabase
            .from('categories')
            .select('*, category_translations(*)')
            .eq('menu_id', selectedMenuId)
            .order('display_order');
          if (data) {
            setCategories(data.map(cat => ({
              ...cat,
              translations: cat.category_translations,
            })) as Category[]);
          }
        }}
      />

      {/* Item Dialog */}
      <ItemDialogWithTranslations
        open={itemDialog.open}
        item={itemDialog.item}
        categoryId={itemDialog.categoryId}
        currency={restaurant.currency}
        restaurantId={restaurant.id}
        supportedLanguages={restaurant.supported_languages}
        defaultLanguage={restaurant.default_language}
        canAddPhoto={canAddPhoto}
        photosUsed={totalPhotos}
        photosLimit={planLimits.photos}
        onClose={() => setItemDialog({ open: false })}
        onSave={async () => {
          // Refetch items with translations
          if (categories.length) {
            const items: Record<string, Item[]> = {};
            for (const cat of categories) {
              const { data } = await supabase
                .from('items')
                .select('*, item_translations(*)')
                .eq('category_id', cat.id)
                .order('display_order');
              items[cat.id] = (data || []).map(item => ({
                ...item,
                translations: item.item_translations,
              })) as Item[];
            }
            setItemsByCategory(items);
          }
        }}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {deleteConfirm?.type === 'menu' ? t('menuEditor.deleteMenuTitle') : 
               deleteConfirm?.type === 'category' ? t('menuEditor.deleteCategoryTitle') : 
               t('menuEditor.deleteItemTitle')}
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            {deleteConfirm?.type === 'menu' 
              ? t('menuEditor.deleteMenuMessage')
              : deleteConfirm?.type === 'category' 
              ? t('menuEditor.deleteCategoryMessage')
              : t('menuEditor.deleteItemMessage')}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>{t('common.cancel')}</Button>
            <Button 
              variant="destructive" 
              onClick={async () => {
                if (deleteConfirm?.type === 'category') {
                  handleDeleteCategory(deleteConfirm.id);
                } else if (deleteConfirm?.type === 'item') {
                  for (const [catId, items] of Object.entries(itemsByCategory)) {
                    if (items.find(i => i.id === deleteConfirm.id)) {
                      handleDeleteItem(deleteConfirm.id, catId);
                      break;
                    }
                  }
                } else if (deleteConfirm?.type === 'menu') {
                  try {
                    const { supabase } = await import('@/integrations/supabase/client');
                    await supabase.from('menus').delete().eq('id', deleteConfirm.id);
                    toast({ title: t('menuEditor.menuDeleted') });
                    setDeleteConfirm(null);
                    // Select another menu
                    const remaining = menus.filter(m => m.id !== deleteConfirm.id);
                    if (remaining.length > 0) {
                      setSelectedMenuId(remaining[0].id);
                    }
                    refetchMenus();
                  } catch (e: any) {
                    toast({ title: t('common.error'), description: e.message, variant: 'destructive' });
                  }
                }
              }}
            >
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Menu Edit Dialog */}
      <MenuEditDialog
        open={menuDialog.open}
        menu={menuDialog.menu}
        restaurantId={restaurant.id}
        menus={menus}
        canUseSchedules={canUseSchedules}
        onClose={() => setMenuDialog({ open: false })}
        onSave={async (data, menu) => {
          try {
            const { supabase } = await import('@/integrations/supabase/client');
            
            if (menu) {
              // Update existing menu
              await supabase
                .from('menus')
                .update({
                  name: data.name,
                  description: data.description,
                  is_active: data.is_active,
                  schedule_rules: data.schedule_rules as any,
                })
                .eq('id', menu.id);
              toast({ title: t('menuEditor.menuUpdated') });
            } else {
              await assertWithinLimits(restaurant.id, { menus: 1 });
              const { data: newMenu, error } = await supabase
                .from('menus')
                .insert({
                  restaurant_id: restaurant.id,
                  name: data.name,
                  description: data.description,
                  is_active: data.is_active,
                  schedule_rules: data.schedule_rules as any,
                  display_order: menus.length,
                })
                .select()
                .single();
              if (error) throw error;
              if (newMenu) {
                setSelectedMenuId(newMenu.id);
              }
              toast({ title: t('menuEditor.menuCreated') });
            }
            setMenuDialog({ open: false });
            refetchMenus();
          } catch (e: any) {
            toast({ title: t('common.error'), description: e.message, variant: 'destructive' });
          }
        }}
      />
    </div>
  );
}

// Category Dialog Component
function CategoryDialog({ 
  open, 
  category, 
  onClose, 
  onSave 
}: { 
  open: boolean; 
  category?: Category; 
  onClose: () => void; 
  onSave: (name: string, description?: string, category?: Category) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (category) {
      setName(category.name);
      setDescription(category.description || '');
    } else {
      setName('');
      setDescription('');
    }
  }, [category, open]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    await onSave(name, description, category);
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? 'Edit Category' : 'Add Category'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cat-name">Name</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Starters, Main Courses"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cat-desc">Description (optional)</Label>
            <Textarea
              id="cat-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of this category"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || !name.trim()}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {category ? 'Save' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Item Dialog Component
function ItemDialog({ 
  open, 
  item, 
  categoryId,
  currency,
  restaurantId,
  canAddPhoto,
  photosUsed,
  photosLimit,
  onClose, 
  onSave 
}: { 
  open: boolean; 
  item?: Item; 
  categoryId?: string;
  currency: string;
  restaurantId: string;
  canAddPhoto: boolean;
  photosUsed: number;
  photosLimit: number;
  onClose: () => void; 
  onSave: (data: Partial<Item>, item?: Item, categoryId?: string) => void;
}) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    photo_url: null as string | null,
    is_featured: false,
    is_vegetarian: false,
    is_vegan: false,
    is_spicy: false,
    is_gluten_free: false,
  });
  const [loading, setLoading] = useState(false);

  // Check if this item already has a photo (editing existing photo doesn't count against limit)
  const itemHasExistingPhoto = item?.photo_url ? true : false;
  const canUploadPhoto = canAddPhoto || itemHasExistingPhoto || formData.photo_url === item?.photo_url;

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        description: item.description || '',
        price: item.price?.toString() || '',
        photo_url: item.photo_url || null,
        is_featured: item.is_featured,
        is_vegetarian: item.is_vegetarian,
        is_vegan: item.is_vegan,
        is_spicy: item.is_spicy,
        is_gluten_free: item.is_gluten_free,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        price: '',
        photo_url: null,
        is_featured: false,
        is_vegetarian: false,
        is_vegan: false,
        is_spicy: false,
        is_gluten_free: false,
      });
    }
  }, [item, open]);

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;
    setLoading(true);
    const data: Partial<Item> = {
      name: formData.name,
      description: formData.description || null,
      price: formData.price ? parseFloat(formData.price) : null,
      photo_url: formData.photo_url,
      is_featured: formData.is_featured,
      is_vegetarian: formData.is_vegetarian,
      is_vegan: formData.is_vegan,
      is_spicy: formData.is_spicy,
      is_gluten_free: formData.is_gluten_free,
    };
    await onSave(data, item, categoryId);
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit Item' : 'Add Item'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t('menuEditor.photo')}</Label>
              {!canAddPhoto && !itemHasExistingPhoto && (
                <Badge variant="outline" className="text-xs gap-1 border-warning/30">
                  <Crown className="h-3 w-3 text-warning" />
                  {t('menuEditor.photosCount', { used: photosUsed, limit: photosLimit })}
                </Badge>
              )}
            </div>
            {canUploadPhoto ? (
              <ImageUpload
                value={formData.photo_url}
                onChange={(url) => setFormData(p => ({ ...p, photo_url: url }))}
                restaurantId={restaurantId}
                folder="items"
                aspectRatio="video"
                maxWidth={800}
                quality={0.85}
              />
            ) : (
              <div className="border-2 border-dashed border-warning/30 rounded-lg p-6 text-center bg-warning/5">
                <Crown className="h-8 w-8 text-warning mx-auto mb-2" />
                <p className="text-sm font-medium">{t('menuEditor.photoLimitReached')}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('menuEditor.upgradeToPhotos', { used: photosUsed, limit: photosLimit })}
                </p>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-name">{t('menuEditor.name')}</Label>
            <Input
              id="item-name"
              value={formData.name}
              onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
              placeholder={t('menuEditor.namePlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-desc">{t('menuEditor.description')}</Label>
            <Textarea
              id="item-desc"
              value={formData.description}
              onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
              placeholder={t('menuEditor.descriptionPlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-price">Price ({currency})</Label>
            <Input
              id="item-price"
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) => setFormData(p => ({ ...p, price: e.target.value }))}
              placeholder="0.00"
            />
          </div>
          
          <div className="space-y-3 pt-2">
            <Label>Options</Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'is_featured', label: 'Featured', icon: Star },
                { key: 'is_vegetarian', label: 'Vegetarian', icon: Leaf },
                { key: 'is_vegan', label: 'Vegan', icon: Leaf },
                { key: 'is_spicy', label: 'Spicy', icon: Flame },
                { key: 'is_gluten_free', label: 'Gluten Free', icon: Wheat },
              ].map(opt => (
                <div key={opt.key} className="flex items-center justify-between p-2 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <opt.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{opt.label}</span>
                  </div>
                  <Switch
                    checked={formData[opt.key as keyof typeof formData] as boolean}
                    onCheckedChange={(v) => setFormData(p => ({ ...p, [opt.key]: v }))}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || !formData.name.trim()}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {item ? 'Save' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Menu Edit Dialog Component
function MenuEditDialog({
  open,
  menu,
  restaurantId,
  menus,
  canUseSchedules,
  onClose,
  onSave,
}: {
  open: boolean;
  menu?: Menu;
  restaurantId: string;
  menus: Menu[];
  canUseSchedules: boolean;
  onClose: () => void;
  onSave: (data: { name: string; description: string | null; is_active: boolean; schedule_rules: ScheduleRule[] | null }, menu?: Menu) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [scheduleRules, setScheduleRules] = useState<ScheduleRule[] | null>(null);
  const [loading, setLoading] = useState(false);

  const overlappingMenu = useMemo(() => {
    if (!isActive) return null;
    
    return menus.find(m => {
      if (m.id === menu?.id || !m.is_active) return false;
      
      // If both are active, check for schedule overlap
      const r1 = (!scheduleRules || scheduleRules.length === 0) 
        ? [{ days: [0, 1, 2, 3, 4, 5, 6], start_time: '00:00', end_time: '23:59' }] 
        : scheduleRules;
      const r2 = (!m.schedule_rules || (m.schedule_rules as any).length === 0) 
        ? [{ days: [0, 1, 2, 3, 4, 5, 6], start_time: '00:00', end_time: '23:59' }] 
        : m.schedule_rules as any as ScheduleRule[];

      for (const rule1 of r1) {
        for (const rule2 of r2) {
          const commonDays = rule1.days.filter(d => rule2.days.includes(d));
          if (commonDays.length > 0) {
            // Simple overlap check (doesn't handle overnight perfectly but covers most cases)
            if (rule1.start_time < rule2.end_time && rule2.start_time < rule1.end_time) {
              return true;
            }
          }
        }
      }
      return false;
    });
  }, [isActive, scheduleRules, menus, menu?.id]);

  useEffect(() => {
    if (open) {
      if (menu) {
        setName(menu.name);
        setDescription(menu.description || '');
        setIsActive(menu.is_active);
        setScheduleRules(menu.schedule_rules || null);
      } else {
        setName('');
        setDescription('');
        setIsActive(true); // Default to active for new menus
        setScheduleRules(null);
      }
    }
  }, [menu, open]);

  const handleSave = async () => {
    if (!name.trim() || overlappingMenu) return;
    setLoading(true);
    await onSave({
      name: name.trim(),
      description: description.trim() || null,
      is_active: isActive,
      schedule_rules: canUseSchedules ? scheduleRules : null,
    }, menu);
    setLoading(false);
  };

  const formatSchedule = (rules: ScheduleRule[] | null) => {
    if (!rules || rules.length === 0) return t('schedule.alwaysActive');
    return rules.map(r => {
      const days = r.days.length === 0
        ? t('schedule.noDays')
        : r.days.length === 7 
          ? t('schedule.allDays') 
          : r.days.map(d => t(`schedule.daysShort.${d}`)).join(', ');
      return `${days} (${r.start_time} - ${r.end_time})`;
    }).join('; ');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{menu ? t('menuEditor.editMenu') : t('menuEditor.newMenu')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="menu-name">{t('menuEditor.menuName')}</Label>
            <Input
              id="menu-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('menuEditor.menuNamePlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="menu-desc">{t('menuEditor.descriptionOptional')}</Label>
            <Textarea
              id="menu-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Una breve descripción del menú"
            />
          </div>
          
          {/* Active toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="space-y-0.5">
              <Label>{t('menuEditor.menuActive')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('menuEditor.menuActiveDesc')}
              </p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
          
          {overlappingMenu && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive space-y-1">
              <p className="text-xs font-medium flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {t('menuEditor.scheduleConflict')}
              </p>
              <p className="text-xs">
                {t('menuEditor.scheduleConflictDesc')} <strong>{overlappingMenu.name}</strong>:
              </p>
              <p className="text-[10px] opacity-80">
                {formatSchedule(overlappingMenu.schedule_rules)}
              </p>
            </div>
          )}
          
          {/* Schedule */}
          <div className="border-t pt-4">
            {canUseSchedules ? (
              <MenuScheduleEditor
                scheduleRules={scheduleRules}
                onChange={setScheduleRules}
              />
            ) : (
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <Clock className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {t('menuEditor.schedulePro')}
                </p>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} disabled={loading || !name.trim() || !!overlappingMenu}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {menu ? t('menuEditor.save') : t('menuEditor.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}