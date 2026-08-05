import { useState, useEffect } from 'react';
import { Category, CategoryTranslation } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Globe, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { useAiTranslation } from '@/hooks/useAiTranslation';
import { cn } from '@/lib/utils';

interface CategoryDialogWithTranslationsProps {
  open: boolean;
  category?: Category;
  supportedLanguages: string[];
  defaultLanguage: string;
  restaurantId: string;
  onClose: () => void;
  onSave: () => void;
  menuId: string;
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

export function CategoryDialogWithTranslations({
  open,
  category,
  supportedLanguages,
  defaultLanguage,
  restaurantId,
  onClose,
  onSave,
  menuId,
}: CategoryDialogWithTranslationsProps) {
  const [activeTab, setActiveTab] = useState(defaultLanguage);
  const [translations, setTranslations] = useState<Record<string, TranslationData>>({});
  const [loading, setLoading] = useState(false);
  const [loadingTranslations, setLoadingTranslations] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();
  const { translate: translateAiField, loading: aiTranslating } = useAiTranslation();

  const handleTranslateField = async (lang: string, field: 'name' | 'description') => {
    const sourceText = translations[defaultLanguage]?.[field];
    if (!sourceText?.trim()) return;
    try {
      const translated = await translateAiField(
        sourceText,
        defaultLanguage,
        lang,
        restaurantId,
        field === 'name'
          ? 'nombre de una categoría de menú de restaurante'
          : 'descripción de una categoría de menú de restaurante',
      );
      handleTranslationChange(lang, field, translated);
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : t('common.unknownError');
      toast({ title: t('common.error'), description: errorMsg, variant: 'destructive' });
    }
  };

  // Load existing translations when editing
  useEffect(() => {
    if (open) {
      setActiveTab(defaultLanguage);
      
      // Initialize translations object
      const initialTranslations: Record<string, TranslationData> = {};
      supportedLanguages.forEach(lang => {
        initialTranslations[lang] = { name: '', description: '' };
      });

      if (category) {
        // Set default language data from category
        initialTranslations[defaultLanguage] = {
          name: category.name,
          description: category.description || '',
        };

        // Load existing translations
        if (category.translations) {
          category.translations.forEach(t => {
            if (t.language !== defaultLanguage) {
              initialTranslations[t.language] = {
                name: t.name,
                description: t.description || '',
              };
            }
          });
        }
      }

      setTranslations(initialTranslations);
    }
  }, [open, category, supportedLanguages, defaultLanguage]);

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
      let categoryId = category?.id;

      if (category) {
        // Update existing category
        await supabase
          .from('categories')
          .update({
            name: defaultData.name,
            description: defaultData.description || null,
          })
          .eq('id', category.id);
      } else {
        // Create new category
        const { data: newCategory, error } = await supabase
          .from('categories')
          .insert({
            menu_id: menuId,
            name: defaultData.name,
            description: defaultData.description || null,
          })
          .select()
          .single();

        if (error) throw error;
        categoryId = newCategory.id;
      }

      // Handle translations for non-default languages
      for (const lang of supportedLanguages) {
        if (lang === defaultLanguage) continue;

        const transData = translations[lang];
        if (!transData?.name?.trim()) continue;

        // Check if translation exists
        const { data: existingTrans } = await supabase
          .from('category_translations')
          .select('id')
          .eq('category_id', categoryId)
          .eq('language', lang)
          .maybeSingle();

        if (existingTrans) {
          // Update existing translation
          await supabase
            .from('category_translations')
            .update({
              name: transData.name,
              description: transData.description || null,
            })
            .eq('id', existingTrans.id);
        } else {
          // Create new translation
          await supabase
            .from('category_translations')
            .insert({
              category_id: categoryId,
              language: lang,
              name: transData.name,
              description: transData.description || null,
            });
        }
      }

      toast({ title: category ? t('menuEditor.categoryUpdated') : t('menuEditor.categoryCreated') });
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
            {category ? t('menuEditor.editCategory') : t('menuEditor.newCategory')}
            {hasMultipleLanguages && <Globe className="h-4 w-4 text-muted-foreground" />}
          </DialogTitle>
        </DialogHeader>

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
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`cat-name-${lang}`}>
                      {t('menuEditor.categoryName')} {lang === defaultLanguage && <span className="text-destructive">*</span>}
                    </Label>
                    {lang !== defaultLanguage && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 text-xs px-2"
                        disabled={aiTranslating || !translations[defaultLanguage]?.name?.trim()}
                        onClick={() => handleTranslateField(lang, 'name')}
                      >
                        {aiTranslating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                        {t('menuEditor.translateWithAI')}
                      </Button>
                    )}
                  </div>
                  <Input
                    id={`cat-name-${lang}`}
                    value={translations[lang]?.name || ''}
                    onChange={(e) => handleTranslationChange(lang, 'name', e.target.value)}
                    placeholder={lang === defaultLanguage ? t('menuEditor.categoryNameExample') : t('menuEditor.translationIn', { lang: LANGUAGE_NAMES[lang] || lang })}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`cat-desc-${lang}`}>{t('menuEditor.descriptionOptional')}</Label>
                    {lang !== defaultLanguage && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 text-xs px-2"
                        disabled={aiTranslating || !translations[defaultLanguage]?.description?.trim()}
                        onClick={() => handleTranslateField(lang, 'description')}
                      >
                        {aiTranslating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                        {t('menuEditor.translateWithAI')}
                      </Button>
                    )}
                  </div>
                  <Textarea
                    id={`cat-desc-${lang}`}
                    value={translations[lang]?.description || ''}
                    onChange={(e) => handleTranslationChange(lang, 'description', e.target.value)}
                    placeholder={t('menuEditor.categoryDescPlaceholder')}
                  />
                </div>
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">{t('menuEditor.categoryName')} <span className="text-destructive">*</span></Label>
              <Input
                id="cat-name"
                value={translations[defaultLanguage]?.name || ''}
                onChange={(e) => handleTranslationChange(defaultLanguage, 'name', e.target.value)}
                placeholder={t('menuEditor.categoryNamePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-desc">{t('menuEditor.categoryDesc')}</Label>
              <Textarea
                id="cat-desc"
                value={translations[defaultLanguage]?.description || ''}
                onChange={(e) => handleTranslationChange(defaultLanguage, 'description', e.target.value)}
                placeholder={t('menuEditor.categoryDescPlaceholder')}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleSubmit} disabled={loading || !translations[defaultLanguage]?.name?.trim()}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {category ? t('common.save') : t('menuEditor.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
