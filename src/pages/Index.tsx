import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LanguageSelector } from '@/components/LanguageSelector';
import { ProblemSection } from '@/components/landing/ProblemSection';
import { SolutionSection } from '@/components/landing/SolutionSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { ComparisonSection } from '@/components/landing/ComparisonSection';
import { PublicPricing } from '@/components/landing/PublicPricing';
import { useTranslation } from '@/hooks/useTranslation';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const NAV_LINKS = [
  { key: 'product', href: '#producto' },
  { key: 'how', href: '#como-funciona' },
  { key: 'pricing', href: '#precios' },
  { key: 'contact', href: '#contacto' },
] as const;

export default function Index() {
  const { t } = useTranslation();
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [isSending, setIsSending] = useState(false);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!contactForm.name.trim() || !contactForm.email.trim() || !contactForm.message.trim()) {
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactForm.email)) {
      toast.error(t('contact.error'));
      return;
    }

    setIsSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-contact', {
        body: {
          name: contactForm.name.trim(),
          email: contactForm.email.trim(),
          message: contactForm.message.trim()
        }
      });

      if (error) throw error;

      toast.success(t('contact.success'), {
        description: t('contact.successDesc')
      });
      setContactForm({ name: '', email: '', message: '' });
    } catch (error) {
      console.error('Contact form error:', error);
      toast.error(t('contact.error'), {
        description: t('contact.errorDesc')
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary/20">
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-4 py-2 sm:px-6 lg:px-8">
          <Link to="/" className="shrink-0" aria-label="SaCarta">
            <img src="/logo.png" alt="SaCarta" className="h-12 w-12 sm:h-16 sm:w-16" />
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium lg:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.key}
                href={link.href}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {t(`nav.${link.key}`)}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-5">
            <LanguageSelector className="w-[96px] sm:w-[140px]" />
            <Link
              to="/auth?mode=signin"
              className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:block"
            >
              {t('header.signIn')}
            </Link>
            <Button asChild size="sm" className="h-9 rounded-sm px-3 text-xs sm:h-10 sm:px-5 sm:text-sm">
              <Link to="/auth?mode=signup">{t('header.startFree')}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="border-b border-border/70">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-6 pb-16 pt-12 lg:grid-cols-12 lg:gap-10 lg:px-8 lg:pb-24 lg:pt-20">
            <div className="lg:col-span-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                {t('hero.kicker')}
              </p>
              <h1 className="mt-7 max-w-2xl font-display text-[clamp(2.8rem,5.6vw,5rem)] font-medium leading-[0.98] tracking-[-0.02em] text-foreground">
                {t('hero.title')}{' '}
                <span className="italic">{t('hero.highlight')}</span>.
              </h1>
              <p className="mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
                {t('hero.description')}
              </p>

              <div className="mt-10 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-7">
                <Button asChild size="lg" className="h-12 rounded-sm px-7 text-base font-semibold">
                  <Link to="/auth?mode=signup">
                    {t('hero.startButton')}
                    <span aria-hidden="true">→</span>
                  </Link>
                </Button>
                <Link
                  to="/m/sacarta"
                  className="text-sm font-semibold text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-foreground hover:decoration-primary"
                >
                  {t('hero.demoLink')}
                </Link>
              </div>

              <p className="mt-8 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                {t('hero.proof')}
              </p>
            </div>

            <div className="lg:col-span-6">
              <div className="mx-auto w-full max-w-[340px] lg:ml-auto lg:mr-0">
                <div className="border border-border bg-card p-2 shadow-[0_30px_80px_-45px_rgba(38,28,23,0.55)]">
                  <div className="flex items-center justify-between border-b border-border px-3 py-2">
                    <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      sacarta.azpy.es/m/sacarta
                    </span>
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
                  </div>
                  <img
                    src="/product/menu-mobile.webp"
                    alt={t('hero.previewCaption')}
                    className="w-full"
                  />
                </div>
                <p className="mt-3 text-left text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {t('hero.previewCaption')}
                </p>
              </div>
            </div>
          </div>
        </section>

        <ProblemSection />

        <SolutionSection />

        <FeaturesSection />

        <section className="border-b border-primary/20 bg-primary py-16 text-primary-foreground lg:py-20">
          <div className="mx-auto w-full max-w-6xl px-6 lg:px-8">
            <p className="max-w-4xl font-display text-3xl font-medium leading-[1.12] tracking-tight sm:text-4xl lg:text-5xl">
              {t('statement.text')}
            </p>
          </div>
        </section>

        <ComparisonSection />

        <PublicPricing />

        <section id="contacto" className="border-b border-border/70 bg-secondary/40 py-20 lg:py-28">
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 lg:grid-cols-12 lg:gap-16 lg:px-8">
            <div className="lg:col-span-4">
              <p className="mb-5 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                {t('contact.kicker')}
              </p>
              <h2 className="font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl">
                {t('contact.title')}
              </h2>
              <p className="mt-6 max-w-sm text-lg leading-relaxed text-muted-foreground">
                {t('contact.subtitle')}
              </p>
              <p className="mt-8 max-w-xs border-t border-border pt-4 text-sm leading-relaxed text-muted-foreground">
                {t('contact.replyTime')}
              </p>
            </div>

            <form onSubmit={handleContactSubmit} className="space-y-7 lg:col-span-8">
              <div className="grid gap-7 sm:grid-cols-2 sm:gap-x-8">
                <div>
                  <Label
                    htmlFor="contact-name"
                    className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                  >
                    {t('contact.name')}
                  </Label>
                  <Input
                    id="contact-name"
                    placeholder={t('contact.namePlaceholder')}
                    value={contactForm.name}
                    onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                    maxLength={100}
                    className="mt-2 h-11 rounded-none border-0 border-b border-input bg-transparent px-0 text-base shadow-none focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="contact-email"
                    className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                  >
                    {t('contact.email')}
                  </Label>
                  <Input
                    id="contact-email"
                    type="email"
                    placeholder={t('contact.emailPlaceholder')}
                    value={contactForm.email}
                    onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                    maxLength={255}
                    className="mt-2 h-11 rounded-none border-0 border-b border-input bg-transparent px-0 text-base shadow-none focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </div>

              <div>
                <Label
                  htmlFor="contact-message"
                  className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                >
                  {t('contact.message')}
                </Label>
                <Textarea
                  id="contact-message"
                  placeholder={t('contact.messagePlaceholder')}
                  value={contactForm.message}
                  onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                  required
                  maxLength={1000}
                  rows={4}
                  className="mt-2 resize-none rounded-none border-0 border-b border-input bg-transparent px-0 text-base shadow-none focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="h-12 rounded-sm px-8 text-sm font-semibold"
                disabled={isSending}
              >
                {isSending ? t('contact.sending') : t('contact.send')}
                {!isSending && <span aria-hidden="true">→</span>}
              </Button>
            </form>
          </div>
        </section>
      </main>

      <footer className="py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            <Link to="/" aria-label="SaCarta">
              <img src="/logo.png" alt="SaCarta" className="h-14 w-14" />
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {t('footer.tagline')}
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {NAV_LINKS.map((link) => (
              <a
                key={link.key}
                href={link.href}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {t(`nav.${link.key}`)}
              </a>
            ))}
          </nav>

          <div className="text-xs leading-relaxed text-muted-foreground">
            <p>{t('footer.madeIn')}</p>
            <p className="mt-1">
              {t('footer.copyright').replace('{year}', new Date().getFullYear().toString())}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
