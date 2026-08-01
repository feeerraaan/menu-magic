import { useState, useEffect } from 'react';
import { Item, ItemTranslation } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImageUpload } from '@/components/ui/image-upload';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Globe, Crown, Star, Leaf, Flame, Wheat, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { useAiDescription } from '@/hooks/useAiDescription';
import type { DescriptionStyle } from '@ai/description';
import { cn } from '@/lib/utils';

const DESCRIPTION_STYLES: { value: DescriptionStyle; label: string }[] = [
  { value: 'luxury', label: 'Lujoso' },
  { value: 'traditional', label: 'Tradicional' },
  { value: 'modern', label: 'Moderno' },
  { value: 'casual', label: 'Casual' },
  { value: 'fine_dining', label: 'Alta cocina' },
];

interface ItemDialogWithTranslationsProps {
  open: boolean;
  item?: Item;
  categoryId?: string;
  currency: string;
  restaurantId: string;
  supportedLanguages: string[];
  defaultLanguage: string;
  canAddPhoto: boolean;
  photosUsed: number;
  photosLimit: number;
  onClose: () => void;
  onSave: () => void;
}

interface TranslationData {
  name: string;
  description: string;
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Español',
  ca: 'Català',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
  pt: 'Português',
};

export function ItemDialogWithTranslations({
  open,
  item,
  categoryId,
  currency,
  restaurantId,
  supportedLanguages,
  defaultLanguage,
  canAddPhoto,
  photosUsed,
  photosLimit,
  onClose,
  onSave,
}: ItemDialogWithTranslationsProps) {
  const [activeTab, setActiveTab] = useState(defaultLanguage);
  const [translations, setTranslations] = useState<Record<string, TranslationData>>({});
  const [formData, setFormData] = useState({
    price: '',
    photo_url: null as string | null,
    is_featured: false,
    is_vegetarian: false,
    is_vegan: false,
    is_spicy: false,
    is_gluten_free: false,
  });
  const [loading, setLoading] = useState(false);
  const [aiStyle, setAiStyle] = useState<DescriptionStyle>('modern');
  const { toast } = useToast();
  const { t } = useTranslation();
  const { generate: generateAiDescription, loading: aiGenerating } = useAiDescription();

  const handleGenerateDescription = async (lang: string) => {
    if (!item) return;
    try {
      const description = await generateAiDescription(item.id, aiStyle, lang);
      handleTranslationChange(lang, 'description', description);
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : t('common.unknownError');
      toast({ title: t('common.error'), description: errorMsg, variant: 'destructive' });
    }
  };

  const itemHasExistingPhoto = item?.photo_url ? true : false;
  const canUploadPhoto = canAddPhoto || itemHasExistingPhoto || formData.photo_url === item?.photo_url;

  useEffect(() => {
    if (open) {
      setActiveTab(defaultLanguage);

      // Initialize translations
      const initialTranslations: Record<string, TranslationData> = {};
      supportedLanguages.forEach(lang => {
        initialTranslations[lang] = { name: '', description: '' };
      });

      if (item) {
        // Set default language data
        initialTranslations[defaultLanguage] = {
          name: item.name,
          description: item.description || '',
        };

        // Load existing translations
        if (item.translations) {
          item.translations.forEach(t => {
            if (t.language !== defaultLanguage) {
              initialTranslations[t.language] = {
                name: t.name,
                description: t.description || '',
              };
            }
          });
        }

        setFormData({
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
          price: '',
          photo_url: null,
          is_featured: false,
          is_vegetarian: false,
          is_vegan: false,
          is_spicy: false,
          is_gluten_free: false,
        });
      }

      setTranslations(initialTranslations);
    }
  }, [open, item, supportedLanguages, defaultLanguage]);

  const handleTranslationChange = (lang: string, field: 'name' | 'description', value: string) => {
    setTranslations(prev => ({
      ...prev,
      [lang]: {
        ...prev[lang],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async () => {
    const defaultData = translations[defaultLanguage];
    if (!defaultData?.name?.trim()) {
      toast({ title: t('common.error'), description: t('common.nameRequired'), variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      let itemId = item?.id;

      const itemData = {
        name: defaultData.name,
        description: defaultData.description || null,
        price: formData.price ? parseFloat(formData.price) : null,
        photo_url: formData.photo_url,
        is_featured: formData.is_featured,
        is_vegetarian: formData.is_vegetarian,
        is_vegan: formData.is_vegan,
        is_spicy: formData.is_spicy,
        is_gluten_free: formData.is_gluten_free,
      };

      if (item) {
        // Update existing item
        await supabase.from('items').update(itemData).eq('id', item.id);
      } else if (categoryId) {
        // Create new item
        const { data: newItem, error } = await supabase
          .from('items')
          .insert({
            ...itemData,
            category_id: categoryId,
            is_active: true,
            allergens: [],
          })
          .select()
          .single();

        if (error) throw error;
        itemId = newItem.id;
      }

      // Handle translations for non-default languages
      for (const lang of supportedLanguages) {
        if (lang === defaultLanguage) continue;

        const transData = translations[lang];
        if (!transData?.name?.trim()) continue;

        // Check if translation exists
        const { data: existingTrans } = await supabase
          .from('item_translations')
          .select('id')
          .eq('item_id', itemId)
          .eq('language', lang)
          .maybeSingle();

        if (existingTrans) {
          // Update existing translation
          await supabase
            .from('item_translations')
            .update({
              name: transData.name,
              description: transData.description || null,
            })
            .eq('id', existingTrans.id);
        } else {
          // Create new translation
          await supabase
            .from('item_translations')
            .insert({
              item_id: itemId,
              language: lang,
              name: transData.name,
              description: transData.description || null,
            });
        }
      }

      toast({ title: item ? t('menuEditor.itemUpdated') : t('menuEditor.itemCreated') });
      onSave();
      onClose();
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : t('common.unknownError');
      toast({ title: t('common.error'), description: errorMsg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const hasMultipleLanguages = supportedLanguages.length > 1;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {item ? t('menuEditor.editItem') : t('menuEditor.newItem')}
            {hasMultipleLanguages && <Globe className="h-4 w-4 text-muted-foreground" />}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Photo upload - always visible */}
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
              <>
                <ImageUpload
                  value={formData.photo_url}
                  onChange={(url) => setFormData(p => ({ ...p, photo_url: url }))}
                  restaurantId={restaurantId}
                  folder="items"
                  aspectRatio="video"
                  maxWidth={800}
                  quality={0.85}
                />
                <p className="text-xs text-muted-foreground">
                  {t('menuEditor.photoDimensionsDesc')}
                </p>
              </>
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

          {/* Translations tabs or simple form */}
          {hasMultipleLanguages ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full flex-wrap h-auto gap-1 p-1">
                {supportedLanguages.map(lang => (
                  <TabsTrigger
                    key={lang}
                    value={lang}
                    className={cn(
                      'flex-1 min-w-[80px] text-xs',
                      translations[lang]?.name?.trim() && 'data-[state=inactive]:border-green-500/50 data-[state=inactive]:border'
                    )}
                  >
                    {LANGUAGE_NAMES[lang] || lang.toUpperCase()}
                    {lang === defaultLanguage && ' *'}
                  </TabsTrigger>
                ))}
              </TabsList>

              {supportedLanguages.map(lang => (
                <TabsContent key={lang} value={lang} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor={`item-name-${lang}`}>
                      Nombre {lang === defaultLanguage && <span className="text-destructive">*</span>}
                    </Label>
                    <Input
                      id={`item-name-${lang}`}
                      value={translations[lang]?.name || ''}
                      onChange={(e) => handleTranslationChange(lang, 'name', e.target.value)}
                      placeholder={lang === defaultLanguage ? 'ej: Pizza Margherita' : `Traducción en ${LANGUAGE_NAMES[lang] || lang}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`item-desc-${lang}`}>Descripción</Label>
                    <Textarea
                      id={`item-desc-${lang}`}
                      value={translations[lang]?.description || ''}
                      onChange={(e) => handleTranslationChange(lang, 'description', e.target.value)}
                      placeholder="Describe el plato..."
                    />
                    {item && (
                      <div className="flex items-center gap-2">
                        <Select value={aiStyle} onValueChange={(v) => setAiStyle(v as DescriptionStyle)}>
                          <SelectTrigger className="h-8 text-xs w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DESCRIPTION_STYLES.map((s) => (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 text-xs"
                          disabled={aiGenerating}
                          onClick={() => handleGenerateDescription(lang)}
                        >
                          {aiGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                          Generar con IA
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="item-name">Nombre <span className="text-destructive">*</span></Label>
                <Input
                  id="item-name"
                  value={translations[defaultLanguage]?.name || ''}
                  onChange={(e) => handleTranslationChange(defaultLanguage, 'name', e.target.value)}
                  placeholder="ej: Pizza Margherita"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-desc">Descripción</Label>
                <Textarea
                  id="item-desc"
                  value={translations[defaultLanguage]?.description || ''}
                  onChange={(e) => handleTranslationChange(defaultLanguage, 'description', e.target.value)}
                  placeholder="Describe el plato..."
                />
                {item && (
                  <div className="flex items-center gap-2">
                    <Select value={aiStyle} onValueChange={(v) => setAiStyle(v as DescriptionStyle)}>
                      <SelectTrigger className="h-8 text-xs w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DESCRIPTION_STYLES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      disabled={aiGenerating}
                      onClick={() => handleGenerateDescription(defaultLanguage)}
                    >
                      {aiGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                      Generar con IA
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Price - always visible */}
          <div className="space-y-2">
            <Label htmlFor="item-price">{t('menuEditor.itemPrice')} ({currency})</Label>
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

          {/* Options - always visible */}
          <div className="space-y-3 pt-2">
            <Label>{t('menuEditor.options')}</Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'is_featured', label: t('menuEditor.featured'), icon: Star },
                { key: 'is_vegetarian', label: t('menuEditor.vegetarian'), icon: Leaf },
                { key: 'is_vegan', label: t('menuEditor.vegan'), icon: Leaf },
                { key: 'is_spicy', label: t('menuEditor.spicy'), icon: Flame },
                { key: 'is_gluten_free', label: t('menuEditor.glutenFree'), icon: Wheat },
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
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleSubmit} disabled={loading || !translations[defaultLanguage]?.name?.trim()}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {item ? t('common.save') : t('menuEditor.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
