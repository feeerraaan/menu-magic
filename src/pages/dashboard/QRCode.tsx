import { useState, useRef, useMemo } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Restaurant } from '@/types/database';
import { useTranslation } from '@/hooks/useTranslation';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useSubscriptionContext } from '@/contexts/SubscriptionContext';
import { useToast } from '@/hooks/use-toast';
import { Download, FileImage, FileText, Printer, Copy, Check } from 'lucide-react';

// Logo modes for the QR center. The free plan is locked to the SaCarta logo (branding);
// paid plans can use their own uploaded logo or go back to a plain QR. The QR always stays
// scannable: level H (30% error correction) + imageSettings.excavate removes the modules the
// logo covers, and the logo is kept small (22% of the QR) well inside the correction budget.
type LogoMode = 'normal' | 'sacarta' | 'restaurant';

const LOGO_STORAGE_KEY = (slug: string) => `sacarta-qr-logo-${slug}`;
const LOGO_SIZE_RATIO = 0.28;

export default function QRCodePage() {
  const { restaurant } = useOutletContext<{ restaurant: Restaurant }>();
  const { t } = useTranslation();
  const { limits } = useSubscriptionContext();
  const [size, setSize] = useState(256);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const canvasRef = useRef<HTMLDivElement>(null);

  const canCustomize = limits.qrCustomization;

  const [logoMode, setLogoMode] = useState<LogoMode>(() => {
    const saved = localStorage.getItem(LOGO_STORAGE_KEY(restaurant.slug));
    return saved === 'normal' || saved === 'sacarta' || saved === 'restaurant' ? saved : 'sacarta';
  });

  const handleLogoModeChange = (mode: LogoMode) => {
    setLogoMode(mode);
    try {
      localStorage.setItem(LOGO_STORAGE_KEY(restaurant.slug), mode);
    } catch {
      // Storage unavailable - keep the choice in-memory for this session.
    }
  };

  // Free plan: always the SaCarta logo in the center, choice is locked.
  const effectiveMode: LogoMode = canCustomize ? logoMode : 'sacarta';

  const logoSrc = useMemo(() => {
    if (effectiveMode === 'restaurant' && restaurant.logo_url) return restaurant.logo_url;
    if (effectiveMode === 'sacarta') return `${window.location.origin}/logo.png`;
    return null;
  }, [effectiveMode, restaurant.logo_url]);

  // imageSettings are expressed relative to the target pixel size, so the logo keeps the same
  // visual proportion on the preview and on the (larger) canvas used for the PNG download.
  const makeImageSettings = (px: number) =>
    logoSrc
      ? {
          src: logoSrc,
          width: Math.floor(px * LOGO_SIZE_RATIO),
          height: Math.floor(px * LOGO_SIZE_RATIO),
          excavate: true,
          crossOrigin: 'anonymous' as const,
        }
      : undefined;

  const menuUrl = `${window.location.origin}/m/${restaurant.slug}`;

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(menuUrl);
    setCopied(true);
    toast({ title: t('qrCode.copiedClipboard') });
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadPNG = () => {
    const canvas = canvasRef.current?.querySelector('canvas');
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = `${restaurant.slug}-qr-code.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast({ title: t('qrCode.downloadedPNG') });
  };

  const downloadSVG = () => {
    const svg = document.getElementById('qr-svg');
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const link = document.createElement('a');
    link.download = `${restaurant.slug}-qr-code.svg`;
    link.href = URL.createObjectURL(blob);
    link.click();
    toast({ title: t('qrCode.downloadedSVG') });
  };

  const downloadPDF = () => {
    // Create printable PDF layout
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: t('qrCode.popupError'), variant: 'destructive' });
      return;
    }

    const svg = document.getElementById('qr-svg');
    const svgData = svg ? new XMLSerializer().serializeToString(svg) : '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${restaurant.name} - QR Code</title>
        <style>
          @page { size: A4; margin: 1.5cm; }
          html, body { margin: 0; padding: 0; }
          body { 
            font-family: 'Georgia', serif; 
            text-align: center; 
            padding: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            box-sizing: border-box;
          }
          h1 { 
            font-size: 30px; 
            margin: 0 0 10px 0; 
            color: #333;
          }
          .qr-container {
            margin: 20px 0;
            max-width: 400px;
            width: 100%;
          }
          .qr-container svg {
            width: 100%;
            height: auto;
            display: block;
          }
          .instructions {
            font-size: 17px;
            color: #666;
            margin-top: 16px;
          }
          .url {
            font-size: 12px;
            color: #999;
            margin-top: 12px;
            word-break: break-all;
          }
        </style>
      </head>
      <body>
        <h1>${restaurant.name}</h1>
        <div class="qr-container">
          ${svgData}
        </div>
        <p class="instructions">${t('qrCode.scanToView')}</p>
        <p class="url">${menuUrl}</p>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
    toast({ title: t('qrCode.downloadedPDF') });
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="font-display text-2xl font-bold">{t('qrCode.title')}</h2>
        <p className="text-muted-foreground">{t('qrCode.subtitle')}</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-6">
            {/* QR Code Preview */}
            <div className="p-6 bg-white rounded-xl shadow-sm border">
              <QRCodeSVG
                id="qr-svg"
                value={menuUrl}
                size={size}
                level="H"
                includeMargin
                bgColor="#ffffff"
                fgColor="#000000"
                imageSettings={makeImageSettings(size)}
              />
            </div>

            {/* Hidden canvas for PNG download */}
            <div ref={canvasRef} className="hidden">
              <QRCodeCanvas
                value={menuUrl}
                size={512}
                level="H"
                includeMargin
                imageSettings={makeImageSettings(512)}
              />
            </div>

            {/* Logo in the center */}
            <div className="w-full space-y-2">
              <Label>{t('qrCode.centerLogo')}</Label>
              <RadioGroup
                value={effectiveMode}
                onValueChange={(v) => handleLogoModeChange(v as LogoMode)}
                disabled={!canCustomize}
                className="gap-1.5"
              >
                <label className="flex items-center gap-2 text-sm rounded-md px-2 py-1.5 hover:bg-muted/60 cursor-pointer disabled:cursor-not-allowed">
                  <RadioGroupItem value="normal" />
                  {t('qrCode.normalQR')}
                </label>
                <label className="flex items-center gap-2 text-sm rounded-md px-2 py-1.5 hover:bg-muted/60 cursor-pointer disabled:cursor-not-allowed">
                  <RadioGroupItem value="sacarta" />
                  {t('qrCode.saCartaLogo')}
                </label>
                <label className="flex items-center gap-2 text-sm rounded-md px-2 py-1.5 hover:bg-muted/60 cursor-pointer disabled:cursor-not-allowed">
                  <RadioGroupItem value="restaurant" disabled={!restaurant.logo_url} />
                  {t('qrCode.myLogo')}
                  {!restaurant.logo_url && (
                    <span className="text-xs text-muted-foreground">{t('qrCode.uploadInSettings')}</span>
                  )}
                </label>
              </RadioGroup>
              {!canCustomize ? (
                <p className="text-xs text-muted-foreground">
                  {t('qrCode.planLogoNote')}
                  <Link to="/dashboard/billing" className="underline hover:text-foreground">
                    {t('qrCode.upgradePlan')}
                  </Link>
                  {t('qrCode.planLogoNote2')}
                </p>
              ) : effectiveMode === 'restaurant' && !restaurant.logo_url ? (
                <p className="text-xs text-muted-foreground">
                  {t('qrCode.noLogoYet')}
                  <Link to="/dashboard/settings" className="underline hover:text-foreground">
                    {t('qrCode.settings')}
                  </Link>
                  {t('qrCode.noLogoYet2')}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">{t('qrCode.logoNote')}</p>
              )}
            </div>

            {/* URL Display */}
            <div className="w-full">
              <Label className="mb-2 block">{t('qrCode.menuURL')}</Label>
              <div className="flex gap-2">
                <Input value={menuUrl} readOnly className="font-mono text-sm" />
                <Button variant="outline" onClick={handleCopyUrl}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Size Slider */}
            <div className="w-full space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t('qrCode.previewSize')}</Label>
                <span className="text-sm text-muted-foreground">{size}px</span>
              </div>
              <Slider
                value={[size]}
                onValueChange={([v]) => setSize(v)}
                min={128}
                max={512}
                step={32}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Download Options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('qrCode.download')}</CardTitle>
          <CardDescription>{t('qrCode.downloadDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={downloadPNG}>
              <FileImage className="h-6 w-6" />
              <span>{t('qrCode.png')}</span>
              <span className="text-xs text-muted-foreground">{t('qrCode.pngDesc')}</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={downloadSVG}>
              <FileText className="h-6 w-6" />
              <span>{t('qrCode.svg')}</span>
              <span className="text-xs text-muted-foreground">{t('qrCode.svgDesc')}</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={downloadPDF}>
              <Printer className="h-6 w-6" />
              <span>{t('qrCode.pdf')}</span>
              <span className="text-xs text-muted-foreground">{t('qrCode.pdfDesc')}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('qrCode.tips')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• {t('qrCode.tip1')}</li>
            <li>• {t('qrCode.tip2')}</li>
            <li>• {t('qrCode.tip3')}</li>
            <li>• {t('qrCode.tip4')}</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
