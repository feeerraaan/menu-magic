import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, Sparkles, Trash2, Upload, FileText } from 'lucide-react';
import { useAiImport } from '@/hooks/useAiImport';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import * as aiApi from '@/lib/ai-api';
import { Progress } from '@/components/ui/progress';
import type { MenuImportResult, MenuImportSourceType } from '@ai/menuImport';
import type { AiJobType } from '@ai/common';

interface AiImportDialogProps {
  open: boolean;
  restaurantId: string;
  onClose: () => void;
  onImported: () => void;
  // Phase 5 (AI Setup): when set to 'ai_setup', the ai_jobs row is tagged distinctly so
  // onboarding imports are separable in analytics. Same pipeline and cost as 'menu_import'.
  jobType?: AiJobType;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function AiImportDialog({ open, restaurantId, onClose, onImported, jobType }: AiImportDialogProps) {
  const { start, reset, starting, job, result, error } = useAiImport(restaurantId, jobType);
  const { toast } = useToast();
  const { t } = useTranslation();
  const [sourceMode, setSourceMode] = useState<MenuImportSourceType>('text');
  const [textValue, setTextValue] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [editable, setEditable] = useState<MenuImportResult | null>(null);
  const [committing, setCommitting] = useState(false);

  useEffect(() => {
    if (result) setEditable(result);
  }, [result]);

  const handleClose = () => {
    reset();
    setEditable(null);
    setTextValue('');
    setFile(null);
    onClose();
  };

  const handleStart = async () => {
    try {
      if (sourceMode === 'text') {
        if (!textValue.trim()) return;
        await start({ sourceType: 'text', text: textValue });
      } else if (sourceMode === 'pdf') {
        if (!file) return;
        const fileBase64 = await fileToBase64(file);
        await start({ sourceType: 'pdf', fileBase64, fileName: file.name });
      }
    } catch (e: unknown) {
      const isCreditError = (e as { status?: number })?.status === 402;
      toast({
        title: isCreditError ? t('aiImport.creditsExhausted') : t('common.error'),
        description: e instanceof Error ? e.message : t('common.unknownError'),
        variant: 'destructive',
      });
    }
  };

  const removeCategory = (categoryIndex: number) => {
    setEditable((prev) => {
      if (!prev) return prev;
      const categories = prev.categories.filter((_, i) => i !== categoryIndex);
      const translationsByLanguage = Object.fromEntries(
        Object.entries(prev.translationsByLanguage).map(([lang, t]) => [
          lang,
          { ...t, categories: t.categories.filter((_, i) => i !== categoryIndex) },
        ]),
      );
      return { ...prev, categories, translationsByLanguage };
    });
  };

  const removeItem = (categoryIndex: number, itemIndex: number) => {
    setEditable((prev) => {
      if (!prev) return prev;
      const categories = prev.categories.map((cat, ci) =>
        ci === categoryIndex ? { ...cat, items: cat.items.filter((_, ii) => ii !== itemIndex) } : cat,
      );
      const translationsByLanguage = Object.fromEntries(
        Object.entries(prev.translationsByLanguage).map(([lang, t]) => [
          lang,
          {
            ...t,
            categories: t.categories.map((cat, ci) =>
              ci === categoryIndex ? { ...cat, items: cat.items.filter((_, ii) => ii !== itemIndex) } : cat,
            ),
          },
        ]),
      );
      return { ...prev, categories, translationsByLanguage };
    });
  };

  const updateCategoryField = (categoryIndex: number, field: 'name' | 'description', value: string) => {
    setEditable((prev) => {
      if (!prev) return prev;
      const categories = prev.categories.map((cat, ci) => (ci === categoryIndex ? { ...cat, [field]: value } : cat));
      return { ...prev, categories };
    });
  };

  const updateItemField = (
    categoryIndex: number,
    itemIndex: number,
    field: 'name' | 'description' | 'price',
    value: string,
  ) => {
    setEditable((prev) => {
      if (!prev) return prev;
      const categories = prev.categories.map((cat, ci) => {
        if (ci !== categoryIndex) return cat;
        const items = cat.items.map((item, ii) => {
          if (ii !== itemIndex) return item;
          if (field === 'price') return { ...item, price: value ? parseFloat(value) : null };
          return { ...item, [field]: value };
        });
        return { ...cat, items };
      });
      return { ...prev, categories };
    });
  };

  const handleCommit = async () => {
    if (!editable) return;
    setCommitting(true);
    try {
      await aiApi.commitImportedMenu({
        restaurantId,
        menuName: editable.menuName,
        categories: editable.categories,
        translationsByLanguage: editable.translationsByLanguage,
      });
      toast({ title: t('aiImport.imported') });
      onImported();
      handleClose();
    } catch (e: unknown) {
      toast({
        title: t('aiImport.saveError'),
        description: e instanceof Error ? e.message : t('common.unknownError'),
        variant: 'destructive',
      });
    } finally {
      setCommitting(false);
    }
  };

  const isProcessing = starting || job?.status === 'queued' || job?.status === 'processing';
  const isFailed = job?.status === 'failed';
  const progress = Math.max(1, Math.min(99, job?.progress ?? (starting ? 2 : 0)));
  const progressStage = typeof job?.input?.progressStage === 'string'
    ? job.input.progressStage
    : t('aiImport.preparing');

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('aiImport.title')}
          </DialogTitle>
        </DialogHeader>

        {!editable && !isProcessing && !isFailed && (
          <div className="space-y-4">
            <Tabs value={sourceMode} onValueChange={(v) => setSourceMode(v as MenuImportSourceType)}>
              <TabsList className="w-full">
                <TabsTrigger value="text" className="flex-1 gap-1.5">
                  <FileText className="h-4 w-4" />
                  {t('aiImport.pasteText')}
                </TabsTrigger>
                <TabsTrigger value="pdf" className="flex-1 gap-1.5">
                  <Upload className="h-4 w-4" />
                  {t('aiImport.pdf')}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="text" className="mt-4">
                <Textarea
                  rows={10}
                  placeholder={t('aiImport.pastePlaceholder')}
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                />
              </TabsContent>
              <TabsContent value="pdf" className="mt-4">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:text-primary-foreground"
                />
                {file && <p className="text-sm text-muted-foreground mt-2">{file.name}</p>}
              </TabsContent>
            </Tabs>
            {error && <p className="text-sm text-destructive">{error.message}</p>}
          </div>
        )}

        {isProcessing && (
          <div className="py-10 text-center space-y-4">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
            <div className="space-y-1">
              <p className="font-medium">{t('aiImport.importing')}</p>
              <p className="text-sm text-muted-foreground">{progressStage}</p>
            </div>
            <div className="mx-auto w-full max-w-md space-y-2 text-left">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t('aiImport.progressTitle')}</span>
                <span className="font-medium text-foreground">{progress}%</span>
              </div>
              <Progress value={progress} aria-label={t('aiImport.importing')} />
            </div>
            <p className="text-sm text-muted-foreground">{t('aiImport.progressNote')}</p>
          </div>
        )}

        {isFailed && (
          <div className="py-8 text-center space-y-2">
            <p className="font-medium text-destructive">{t('common.error')}</p>
            <p className="text-sm text-muted-foreground">{job?.error}</p>
          </div>
        )}

        {editable && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t('aiImport.reviewNote')}</p>
            <div className="space-y-2">
              <Label>{t('aiImport.menuName')}</Label>
              <Input
                value={editable.menuName}
                onChange={(e) => setEditable((p) => (p ? { ...p, menuName: e.target.value } : p))}
              />
            </div>
            {editable.categories.map((category, categoryIndex) => (
              <div key={categoryIndex} className="border rounded-lg p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={category.name}
                    onChange={(e) => updateCategoryField(categoryIndex, 'name', e.target.value)}
                    className="font-medium"
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeCategory(categoryIndex)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="space-y-3 pl-2">
                  {category.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex items-start gap-2 border-l-2 pl-2">
                      <div className="flex-1 space-y-1.5">
                        <Input
                          value={item.name}
                          onChange={(e) => updateItemField(categoryIndex, itemIndex, 'name', e.target.value)}
                        />
                        <Textarea
                          value={item.description ?? ''}
                          onChange={(e) => updateItemField(categoryIndex, itemIndex, 'description', e.target.value)}
                          rows={2}
                          placeholder={t('aiImport.description')}
                        />
                        <Input
                          type="number"
                          step="0.01"
                          value={item.price ?? ''}
                          onChange={(e) => updateItemField(categoryIndex, itemIndex, 'price', e.target.value)}
                          placeholder={t('aiImport.price')}
                          className="w-28"
                        />
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeItem(categoryIndex, itemIndex)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t('common.cancel')}
          </Button>
          {!editable && !isProcessing && (
            <Button onClick={handleStart} disabled={starting} className="gap-2">
              {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {t('aiImport.analyze')}
            </Button>
          )}
          {editable && (
            <Button onClick={handleCommit} disabled={committing} className="gap-2">
              {committing && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('aiImport.save')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
