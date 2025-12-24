import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { QrCode, BarChart3, Globe, ArrowRight } from 'lucide-react';
import { PRICING_PLANS } from '@/lib/constants';
import { PricingCard } from '@/components/PricingCard';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useTranslation } from '@/hooks/useTranslation';

export default function Index() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary/20">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur-md sticky top-0 z-50 transition-all duration-300">
        <div className="container mx-auto flex items-center justify-between py-2 px-6">
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="h-20 w-20">
                <img src="/logo.png" alt="SaCarta Logo"/>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSelector className="w-[150px]" />
            <Link to="/auth?mode=signin">
              <Button variant="ghost" className="font-medium hover:bg-primary/5 hover:text-primary">{t('header.signIn')}</Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button className="rounded-full shadow-md shadow-primary/20">{t('header.startFree')}</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-20 lg:pb-32">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-20 blur-[100px]"></div>
        
        <div className="container mx-auto px-4 text-center">
          <div className="space-y-6 max-w-4xl mx-auto">
            <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight leading-[1.1]">
              {t('hero.title')} <br />
              <span className="relative inline-block mt-1 sm:mt-2">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-orange-500 to-accent drop-shadow-sm">
                  {t('hero.highlight')}
                </span>
                <svg className="absolute w-[110%] h-3 -bottom-2 -left-[5%] text-primary/30 hidden sm:block" viewBox="0 0 200 9" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2.00025 6.99997C25.7501 2.49994 132.5 -1.49996 198 6.99997" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                </svg>
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {t('hero.description')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link to="/auth">
                <Button size="lg" className="text-lg px-8 h-14 rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:-translate-y-0.5">
                  {t('hero.startButton')} <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/m/demo">
                <Button size="lg" variant="outline" className="text-lg px-8 h-14 rounded-full border-2 hover:bg-secondary/50 transition-all hover:-translate-y-0.5">
                  {t('hero.demoButton')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-display text-4xl font-bold mb-4">
              {t('features.title')}
            </h2>
            <p className="text-muted-foreground text-lg">
              {t('features.subtitle')}
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            { [
              { icon: QrCode, title: t('features.qr.title'), desc: t('features.qr.desc') },
              { icon: Globe, title: t('features.translation.title'), desc: t('features.translation.desc') },
              { icon: BarChart3, title: t('features.analytics.title'), desc: t('features.analytics.desc') },
            ].map((f, i) => (
              <div key={i} className="group bg-card hover:bg-card/50 p-8 rounded-2xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-display text-xl font-bold mb-3">{f.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 relative">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-display text-4xl font-bold mb-4">{t('pricing.title')}</h2>
            <p className="text-muted-foreground text-lg">{t('pricing.subtitle')}</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {PRICING_PLANS.map((plan, i) => (
              <PricingCard 
                key={i}
                plan={plan}
                isPublic={true}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-secondary/20 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground text-sm">
            {t('footer.copyright').replace('{year}', new Date().getFullYear().toString())}
          </p>
        </div>
      </footer>
    </div>
  );
}