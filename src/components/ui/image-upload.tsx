import { useState, useRef, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Upload, X, Loader2, Image as ImageIcon, Crop } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  restaurantId: string;
  folder?: 'items' | 'logos';
  className?: string;
  aspectRatio?: 'square' | 'video' | 'wide';
  maxSizeMB?: number;
  maxWidth?: number;
  quality?: number;
}

interface CroppedAreaPixels {
  width: number;
  height: number;
  x: number;
  y: number;
}

// Crops the image to a square region defined in natural-image pixel coordinates, resizes to
// maxWidth, and returns a WebP blob. The uploaded image is always square, which is what the
// QR logo (and the item thumbs) expect.
function cropToSquareBlob(
  imageSrc: string,
  area: CroppedAreaPixels,
  maxWidth: number,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(imageSrc);
      const outSize = Math.max(1, Math.min(maxWidth, Math.round(area.width)));
      const canvas = document.createElement('canvas');
      canvas.width = outSize;
      canvas.height = outSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, outSize, outSize);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not crop image'))),
        'image/webp',
        quality,
      );
    };
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = imageSrc;
  });
}

export function ImageUpload({
  value,
  onChange,
  restaurantId,
  folder = 'items',
  className,
  aspectRatio = 'square',
  maxSizeMB = 5,
  maxWidth = 1200,
  quality = 0.8,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropPixels, setCropPixels] = useState<CroppedAreaPixels | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

  const aspectClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    wide: 'aspect-[3/1]',
  };

  const openCropper = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: t('imageUpload.invalidFile'), variant: 'destructive' });
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast({
        title: t('imageUpload.sizeLimit', { size: maxSizeMB.toString() }),
        variant: 'destructive',
      });
      return;
    }
    setCropSrc(URL.createObjectURL(file));
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCropPixels(null);
    setCropOpen(true);
  }, [maxSizeMB, toast, t]);

  const closeCropper = useCallback(() => {
    setCropOpen(false);
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  }, [cropSrc]);

  const confirmCrop = useCallback(async () => {
    if (!cropSrc || !cropPixels) return;
    const src = cropSrc;
    setCropOpen(false);
    setCropSrc(null);
    setUploading(true);
    try {
      const cropped = await cropToSquareBlob(src, cropPixels, maxWidth, quality);

      const fileName = `${restaurantId}/${folder}/${Date.now()}.webp`;
      const { error: uploadError } = await supabase.storage
        .from('menu-images')
        .upload(fileName, cropped, {
          contentType: 'image/webp',
          cacheControl: '31536000',
        });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('menu-images').getPublicUrl(fileName);
      onChange(data.publicUrl);
      toast({ title: t('imageUpload.uploaded') });
    } catch (e: unknown) {
      // cropToSquareBlob revokes the URL only on a successful load; revoke here on failure
      URL.revokeObjectURL(src);
      const message = e instanceof Error ? e.message : 'Unknown error';
      toast({ title: t('imageUpload.failed'), description: message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  }, [cropSrc, cropPixels, maxWidth, quality, restaurantId, folder, onChange, toast, t]);

  const handleRemove = useCallback(async () => {
    if (!value) return;
    try {
      const url = new URL(value);
      const pathParts = url.pathname.split('/menu-images/');
      if (pathParts[1]) {
        await supabase.storage.from('menu-images').remove([pathParts[1]]);
      }
    } catch {
      // Ignore removal errors
    }
    onChange(null);
  }, [value, onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) openCropper(file);
  }, [openCropper]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) openCropper(file);
    if (inputRef.current) inputRef.current.value = '';
  }, [openCropper]);

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {value ? (
        <div className={cn('relative rounded-lg overflow-hidden border bg-muted', aspectClasses[aspectRatio])}>
          <img
            src={value}
            alt="Uploaded"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-colors group">
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          disabled={uploading}
          className={cn(
            'w-full rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors',
            aspectClasses[aspectRatio],
            dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50',
            uploading && 'opacity-50 cursor-not-allowed'
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Uploading...</span>
            </>
          ) : (
            <>
              <div className="p-3 rounded-full bg-muted">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Drop image here or click to upload</p>
                <p className="text-xs text-muted-foreground">Max {maxSizeMB}MB · se recorta a cuadrado</p>
              </div>
            </>
          )}
        </button>
      )}

      <Dialog open={cropOpen} onOpenChange={(o) => !o && closeCropper()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crop className="h-5 w-5 text-primary" />
              Recorta tu imagen
            </DialogTitle>
          </DialogHeader>
          <div className="relative h-72 w-full overflow-hidden rounded-lg bg-muted">
            {cropSrc && (
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                rotation={0}
                aspect={1}
                minZoom={1}
                maxZoom={4}
                cropShape="rect"
                zoomSpeed={1}
                showGrid
                zoomWithScroll
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, areaPixels) => setCropPixels(areaPixels)}
              />
            )}
          </div>
          <div className="flex items-center gap-3 pt-2">
            <span className="text-sm text-muted-foreground">Zoom</span>
            <Slider
              value={[zoom]}
              onValueChange={([v]) => setZoom(v)}
              min={1}
              max={4}
              step={0.05}
              className="flex-1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeCropper}>
              Cancelar
            </Button>
            <Button onClick={confirmCrop} disabled={!cropPixels}>
              Usar imagen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
