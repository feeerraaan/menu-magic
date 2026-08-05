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
        title: isCreditError ? 'Créditos IA agotados' : 'Error',
        description: e instanceof Error ? e.message : 'Error desconocido',
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
      toast({ title: 'Menú importado correctamente' });
      onImported();
      handleClose();
    } catch (e: unknown) {
      toast({
        title: 'Error al guardar',
        description: e instanceof Error ? e.message : 'Error desconocido',
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
    : 'Preparando la importación';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Importar menú con IA
          </DialogTitle>
        </DialogHeader>

        {!editable && !isProcessing && !isFailed && (
          <div className="space-y-4">
            <Tabs value={sourceMode} onValueChange={(v) => setSourceMode(v as MenuImportSourceType)}>
              <TabsList className="w-full">
                <TabsTrigger value="text" className="flex-1 gap-1.5">
                  <FileText className="h-4 w-4" />
                  Pegar texto
                </TabsTrigger>
                <TabsTrigger value="pdf" className="flex-1 gap-1.5">
                  <Upload className="h-4 w-4" />
                  PDF
                </TabsTrigger>
              </TabsList>
              <TabsContent value="text" className="mt-4">
                <Textarea
                  rows={10}
                  placeholder="Pega aquí el texto de tu menú (nombres de platos, precios, descripciones...)"
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
              <p className="font-medium">Importando tu menú con IA...</p>
              <p className="text-sm text-muted-foreground">{progressStage}</p>
            </div>
            <div className="mx-auto w-full max-w-md space-y-2 text-left">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Progreso real del trabajo</span>
                <span className="font-medium text-foreground">{progress}%</span>
              </div>
              <Progress value={progress} aria-label={`Progreso de importación: ${progress}%`} />
            </div>
            <p className="text-sm text-muted-foreground">
              Puedes dejar esta ventana abierta. El progreso se actualiza al terminar cada bloque y cada traducción.
            </p>
          </div>
        )}

        {isFailed && (
          <div className="py-8 text-center space-y-2">
            <p className="font-medium text-destructive">No se pudo importar el menú</p>
            <p className="text-sm text-muted-foreground">{job?.error}</p>
          </div>
        )}

        {editable && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Revisa y edita lo que ha extraído la IA antes de guardarlo. Nada se publica todavía.
            </p>
            <div className="space-y-2">
              <Label>Nombre del menú</Label>
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
                          placeholder="Descripción"
                        />
                        <Input
                          type="number"
                          step="0.01"
                          value={item.price ?? ''}
                          onChange={(e) => updateItemField(categoryIndex, itemIndex, 'price', e.target.value)}
                          placeholder="Precio"
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
            Cancelar
          </Button>
          {!editable && !isProcessing && (
            <Button onClick={handleStart} disabled={starting} className="gap-2">
              {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Analizar con IA
            </Button>
          )}
          {editable && (
            <Button onClick={handleCommit} disabled={committing} className="gap-2">
              {committing && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar en mi menú
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
