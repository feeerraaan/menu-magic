import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

async function compressImage(
  file: File,
  maxWidth: number = 1200,
  quality: number = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      
      let { width, height } = img;
      
      // Scale down if larger than maxWidth
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // Use high quality scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Could not compress image'));
          }
        },
        'image/webp',
        quality
      );
    };
    
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = URL.createObjectURL(file);
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
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const aspectClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    wide: 'aspect-[3/1]',
  };

  const handleUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Please upload an image file', variant: 'destructive' });
      return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      toast({ title: `Image must be less than ${maxSizeMB}MB`, variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      // Compress the image
      const compressed = await compressImage(file, maxWidth, quality);
      
      // Generate unique filename
      const fileName = `${restaurantId}/${folder}/${Date.now()}.webp`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('menu-images')
        .upload(fileName, compressed, {
          contentType: 'image/webp',
          cacheControl: '31536000',
        });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data } = supabase.storage.from('menu-images').getPublicUrl(fileName);
      onChange(data.publicUrl);
      
      toast({ title: 'Image uploaded' });
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  }, [restaurantId, folder, maxWidth, quality, maxSizeMB, onChange, toast]);

  const handleRemove = useCallback(async () => {
    if (!value) return;
    
    try {
      // Extract path from URL
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
    if (file) handleUpload(file);
  }, [handleUpload]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    if (inputRef.current) inputRef.current.value = '';
  }, [handleUpload]);

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
                <p className="text-xs text-muted-foreground">Max {maxSizeMB}MB, auto-compressed</p>
              </div>
            </>
          )}
        </button>
      )}
    </div>
  );
}
