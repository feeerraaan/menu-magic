import { Link } from 'react-router-dom';
import { PRICING_PLANS } from '@/lib/constants';
import { useTranslation } from '@/hooks/useTranslation';

export function PublicPricing() {
  const { t, tRaw } = useTranslation();

  return (
    <section id="precios" className="border-b border-border/70 py-20 lg:py-28">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 lg:grid-cols-12 lg:gap-16 lg:px-8">
        <div className="lg:col-span-4">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            {t('pricing.kicker')}
          </p>
          <h2 className="font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl">
            {t('pricing.title')}
          </h2>
          <p className="mt-6 max-w-sm text-lg leading-relaxed text-muted-foreground">
            {t('pricing.subtitle')}
          </p>
          <p className="mt-6 max-w-xs border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
            {t('pricing.note')}
          </p>
        </div>

        <div className="lg:col-span-8">
          <div className="border-t border-border">
            {PRICING_PLANS.map((plan, i) => {
              const features = (tRaw(`pricing.plans.${plan.id}.features`) ?? plan.features) as string[];
              const tagline = t(`pricing.planTaglines.${plan.id}`);
              const cta = t(`pricing.planCta.${plan.id}`);
              const period = plan.id === 'myotragus' ? t('pricing.oneTime') : t('pricing.perMonth');

              return (
                <div
                  key={plan.id}
                  className="grid gap-6 border-b border-border py-8 sm:grid-cols-[1fr_auto] sm:items-start sm:gap-10"
                >
                  <div>
                    <div className="flex items-baseline gap-3">
                      <h3 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">
                        {t(`pricing.plans.${plan.id}.name`)}
                      </h3>
                      <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{tagline}</p>
                    <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-sm leading-relaxed text-muted-foreground">
                      {features.map((feature, j) => (
                        <li key={j} className="before:mr-2 before:text-primary before:content-['·']">
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="sm:text-right">
                    <p>
                      <span className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
                        {plan.price}
                      </span>
                      <span className="ml-1 text-sm text-muted-foreground">{period}</span>
                    </p>
                    <Link
                      to="/auth?mode=signup"
                      className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:text-foreground"
                    >
                      {cta}
                      <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
