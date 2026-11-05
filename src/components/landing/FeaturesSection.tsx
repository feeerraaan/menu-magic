import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';

const FEATURES = [
  { key: 'qr', image: '/product/qr.webp' },
  { key: 'translation', image: '/product/customer-assistant.webp' },
  { key: 'analytics', image: '/product/analytics.webp' },
] as const;

export function FeaturesSection() {
  const { t } = useTranslation();

  return (
    <section id="producto" className="border-b border-border/70 py-20 lg:py-28">
      <div className="mx-auto w-full max-w-6xl px-6 lg:px-8">
        <div className="grid gap-6 border-b border-border pb-10 lg:grid-cols-12 lg:items-end lg:gap-10">
          <div className="lg:col-span-8">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              {t('features.kicker')}
            </p>
            <h2 className="max-w-2xl font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl">
              {t('features.title')}
            </h2>
          </div>
          <p className="max-w-sm text-base leading-relaxed text-muted-foreground lg:col-span-4">
            {t('features.subtitle')}
          </p>
        </div>

        <div className="mt-14 space-y-16 lg:mt-20 lg:space-y-24">
          {FEATURES.map((feature, i) => (
            <article key={feature.key} className="grid items-center gap-8 lg:grid-cols-12 lg:gap-14">
              <div className={cn('lg:col-span-5', i % 2 === 1 && 'lg:order-2 lg:col-start-8')}>
                <span className="font-display text-xl tabular-nums text-primary/80">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-3 font-display text-3xl font-medium leading-tight tracking-tight sm:text-4xl">
                  {t(`features.${feature.key}.title`)}
                </h3>
                <p className="mt-4 max-w-md text-lg leading-relaxed text-muted-foreground">
                  {t(`features.${feature.key}.desc`)}
                </p>
              </div>

              <figure
                className={cn(
                  'lg:col-span-7',
                  i % 2 === 1 && 'lg:order-1 lg:col-start-1 lg:row-start-1',
                )}
              >
                <div className="border border-border bg-card p-2 shadow-[0_28px_70px_-45px_rgba(38,28,23,0.5)]">
                  <img
                    src={feature.image}
                    alt={t(`features.${feature.key}.title`)}
                    className="w-full"
                    loading="lazy"
                  />
                </div>
              </figure>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
