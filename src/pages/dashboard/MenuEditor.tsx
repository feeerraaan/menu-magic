import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Restaurant, Category, Item, Menu } from '@/types/database';
import { useMenus, useCategories, useItems } from '@/hooks/useRestaurant';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImageUpload } from '@/components/ui/image-upload';

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
            <span className="text-sm text-muted-foreground">({items.length} items)</span>
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
                      'flex items-center gap-3 p-3 pl-8 rounded-lg border bg-card hover:border-primary/30 transition-colors',
                      !item.is_active && 'opacity-50'
                    )}>
                      {item.photo_url && (
                        <img src={item.photo_url} alt={item.name} className="h-12 w-12 rounded object-cover flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{item.name}</span>
                          {item.is_featured && <Star className="h-3 w-3 text-warning fill-warning" />}
                          {item.is_vegetarian && <Leaf className="h-3 w-3 text-green-600" />}
                          {item.is_vegan && <Leaf className="h-3 w-3 text-green-700 fill-green-700" />}
                          {item.is_spicy && <Flame className="h-3 w-3 text-red-500" />}
                          {item.is_gluten_free && <Wheat className="h-3 w-3 text-amber-600 line-through" />}
                        </div>
                        {item.description && (
                          <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {item.price !== null && (
                          <span className="font-semibold text-primary">{item.price.toFixed(2)}</span>
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
                <Button variant="outline" className="w-full mt-2" onClick={onAddItem}>
                  <Plus className="mr-2 h-4 w-4" /> Add Item
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
  const { menus, loading: menusLoading } = useMenus(restaurant.id);
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const { categories, create: createCategory, update: updateCategory, remove: removeCategory, reorder: reorderCategories, setCategories } = useCategories(selectedMenuId || undefined);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [itemsByCategory, setItemsByCategory] = useState<Record<string, Item[]>>({});
  
  // Dialogs
  const [categoryDialog, setCategoryDialog] = useState<{ open: boolean; category?: Category }>({ open: false });
  const [itemDialog, setItemDialog] = useState<{ open: boolean; item?: Item; categoryId?: string }>({ open: false });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; type: 'category' | 'item'; id: string } | null>(null);
  
  const { toast } = useToast();

  // Set initial menu
  useEffect(() => {
    if (menus.length > 0 && !selectedMenuId) {
      setSelectedMenuId(menus[0].id);
    }
  }, [menus, selectedMenuId]);

  // Fetch items for all categories
  useEffect(() => {
    const fetchItems = async () => {
      if (!categories.length) return;
      const items: Record<string, Item[]> = {};
      for (const cat of categories) {
        const { data } = await import('@/integrations/supabase/client').then(m => 
          m.supabase.from('items').select('*').eq('category_id', cat.id).order('display_order')
        );
        items[cat.id] = (data || []) as Item[];
      }
      setItemsByCategory(items);
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
        toast({ title: 'Category updated' });
      } else {
        await createCategory(name);
        toast({ title: 'Category created' });
      }
      setCategoryDialog({ open: false });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await removeCategory(id);
      toast({ title: 'Category deleted' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
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
        toast({ title: 'Item updated' });
      } else if (categoryId) {
        const insertData = { ...data, category_id: categoryId, display_order: (itemsByCategory[categoryId]?.length || 0) };
        const { data: newItem } = await supabase
          .from('items')
          .insert([insertData as any])
          .select()
          .single();
        if (newItem) {
          setItemsByCategory(prev => ({
            ...prev,
            [categoryId]: [...(prev[categoryId] || []), newItem as Item],
          }));
        }
        toast({ title: 'Item created' });
      }
      setItemDialog({ open: false });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
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
      toast({ title: 'Item deleted' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
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
        toast({ title: 'Item duplicated' });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
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
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
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
      toast({ title: 'Error saving order', variant: 'destructive' });
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Menu Editor</h2>
          <p className="text-muted-foreground">Manage your categories and menu items</p>
        </div>
        <div className="flex items-center gap-3">
          {menus.length > 1 && (
            <Select value={selectedMenuId || ''} onValueChange={setSelectedMenuId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select menu" />
              </SelectTrigger>
              <SelectContent>
                {menus.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={() => setCategoryDialog({ open: true })}>
            <Plus className="mr-2 h-4 w-4" /> Add Category
          </Button>
        </div>
      </div>

      {categories.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">No categories yet. Start by adding one.</p>
          <Button onClick={() => setCategoryDialog({ open: true })}>
            <Plus className="mr-2 h-4 w-4" /> Add Category
          </Button>
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

      {/* Category Dialog */}
      <CategoryDialog
        open={categoryDialog.open}
        category={categoryDialog.category}
        onClose={() => setCategoryDialog({ open: false })}
        onSave={handleSaveCategory}
      />

      {/* Item Dialog */}
      <ItemDialog
        open={itemDialog.open}
        item={itemDialog.item}
        categoryId={itemDialog.categoryId}
        currency={restaurant.currency}
        restaurantId={restaurant.id}
        onClose={() => setItemDialog({ open: false })}
        onSave={handleSaveItem}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteConfirm?.type}?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            {deleteConfirm?.type === 'category' 
              ? 'This will also delete all items in this category.'
              : 'This action cannot be undone.'}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (deleteConfirm?.type === 'category') {
                  handleDeleteCategory(deleteConfirm.id);
                } else if (deleteConfirm?.type === 'item') {
                  // Find category ID for this item
                  for (const [catId, items] of Object.entries(itemsByCategory)) {
                    if (items.find(i => i.id === deleteConfirm.id)) {
                      handleDeleteItem(deleteConfirm.id, catId);
                      break;
                    }
                  }
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  onClose, 
  onSave 
}: { 
  open: boolean; 
  item?: Item; 
  categoryId?: string;
  currency: string;
  restaurantId: string;
  onClose: () => void; 
  onSave: (data: Partial<Item>, item?: Item, categoryId?: string) => void;
}) {
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
            <Label>Photo</Label>
            <ImageUpload
              value={formData.photo_url}
              onChange={(url) => setFormData(p => ({ ...p, photo_url: url }))}
              restaurantId={restaurantId}
              folder="items"
              aspectRatio="video"
              maxWidth={800}
              quality={0.85}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-name">Name</Label>
            <Input
              id="item-name"
              value={formData.name}
              onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g., Margherita Pizza"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-desc">Description</Label>
            <Textarea
              id="item-desc"
              value={formData.description}
              onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
              placeholder="Describe the dish..."
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