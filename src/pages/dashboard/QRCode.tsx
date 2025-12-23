import { useState, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Restaurant } from '@/types/database';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { Download, FileImage, FileText, Printer, Copy, Check } from 'lucide-react';

export default function QRCodePage() {
  const { restaurant } = useOutletContext<{ restaurant: Restaurant }>();
  const [size, setSize] = useState(256);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const canvasRef = useRef<HTMLDivElement>(null);

  const menuUrl = `${window.location.origin}/m/${restaurant.slug}`;

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(menuUrl);
    setCopied(true);
    toast({ title: 'URL copied to clipboard' });
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadPNG = () => {
    const canvas = canvasRef.current?.querySelector('canvas');
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = `${restaurant.slug}-qr-code.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast({ title: 'QR Code downloaded as PNG' });
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
    toast({ title: 'QR Code downloaded as SVG' });
  };

  const downloadPDF = () => {
    // Create printable PDF layout
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: 'Please allow popups to download PDF', variant: 'destructive' });
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
          @page { size: A4; margin: 2cm; }
          body { 
            font-family: 'Georgia', serif; 
            text-align: center; 
            padding: 40px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            box-sizing: border-box;
          }
          h1 { 
            font-size: 48px; 
            margin-bottom: 20px; 
            color: #333;
          }
          .qr-container {
            margin: 40px 0;
          }
          .instructions {
            font-size: 24px;
            color: #666;
            margin-top: 30px;
          }
          .url {
            font-size: 14px;
            color: #999;
            margin-top: 20px;
            word-break: break-all;
          }
        </style>
      </head>
      <body>
        <h1>${restaurant.name}</h1>
        <div class="qr-container">
          ${svgData}
        </div>
        <p class="instructions">Scan to view our menu</p>
        <p class="url">${menuUrl}</p>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="font-display text-2xl font-bold">QR Code</h2>
        <p className="text-muted-foreground">Generate and download your menu QR code</p>
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
              />
            </div>

            {/* Hidden canvas for PNG download */}
            <div ref={canvasRef} className="hidden">
              <QRCodeCanvas
                value={menuUrl}
                size={512}
                level="H"
                includeMargin
              />
            </div>

            {/* URL Display */}
            <div className="w-full">
              <Label className="mb-2 block">Menu URL</Label>
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
                <Label>Preview Size</Label>
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
          <CardTitle className="text-lg">Download</CardTitle>
          <CardDescription>Choose your preferred format</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={downloadPNG}>
              <FileImage className="h-6 w-6" />
              <span>PNG Image</span>
              <span className="text-xs text-muted-foreground">Best for digital use</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={downloadSVG}>
              <FileText className="h-6 w-6" />
              <span>SVG Vector</span>
              <span className="text-xs text-muted-foreground">Scalable, best for print</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={downloadPDF}>
              <Printer className="h-6 w-6" />
              <span>Print PDF</span>
              <span className="text-xs text-muted-foreground">A4 with restaurant name</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tips for using your QR code</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Place QR codes on tables, menus, or at the entrance</li>
            <li>• Use the SVG format for large prints to maintain quality</li>
            <li>• Test the QR code with your phone before printing</li>
            <li>• Consider adding a small instruction like "Scan for menu"</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}