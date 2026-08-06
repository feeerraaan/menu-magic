import { X, Check } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

type ComparisonRow = { label: string; before: string; after: string };

/** Landing "Before vs After SaCarta" comparison section. Task 10. */
export function ComparisonSection() {
  const { t, tRaw } = useTranslation();
  const rows = (tRaw('comparison.rows') ?? []) as ComparisonRow[];

  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-display text-4xl font-bold mb-4">{t('comparison.title')}</h2>
          <p className="text-muted-foreground text-lg">{t('comparison.subtitle')}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {/* Before */}
          <div className="rounded-2xl border border-border/60 bg-card/60 p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-8">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted border border-border">
                <X className="h-4 w-4 text-muted-foreground" />
              </span>
              <h3 className="font-display text-xl font-bold text-muted-foreground">{t('comparison.beforeLabel')}</h3>
            </div>
            <ul className="space-y-6">
              {rows.map((row, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-muted">
                    <X className="h-3 w-3 text-muted-foreground/70" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1">
                      {row.label}
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed line-through decoration-muted-foreground/30">
                      {row.before}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* After */}
          <div className="relative rounded-2xl border-2 border-primary/40 bg-gradient-to-b from-primary/5 to-card p-6 sm:p-8 shadow-lg shadow-primary/10">
            <div className="flex items-center gap-3 mb-8">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-4 w-4" />
              </span>
              <h3 className="font-display text-xl font-bold text-primary">{t('comparison.afterLabel')}</h3>
            </div>
            <ul className="space-y-6">
              {rows.map((row, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Check className="h-3 w-3" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary/70 mb-1">
                      {row.label}
                    </p>
                    <p className="text-sm text-foreground font-medium leading-relaxed">{row.after}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
