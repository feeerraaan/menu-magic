import { useTranslation } from '@/hooks/useTranslation';

type ComparisonRow = { label: string; before: string; after: string };

export function ComparisonSection() {
  const { t, tRaw } = useTranslation();
  const rows = (tRaw('comparison.rows') ?? []) as ComparisonRow[];

  return (
    <section className="border-b border-border/70 py-20 lg:py-28">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 lg:grid-cols-12 lg:gap-16 lg:px-8">
        <div className="lg:col-span-4">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            {t('comparison.kicker')}
          </p>
          <h2 className="font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl">
            {t('comparison.title')}
          </h2>
          <p className="mt-6 max-w-sm text-lg leading-relaxed text-muted-foreground">
            {t('comparison.subtitle')}
          </p>
        </div>

        <div className="lg:col-span-8">
          <div className="grid grid-cols-2 border-t border-border">
            <p className="py-3 pr-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {t('comparison.beforeLabel')}
            </p>
            <p className="border-l border-border py-3 pl-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary sm:pl-8">
              {t('comparison.afterLabel')}
            </p>
          </div>

          {rows.map((row, i) => (
            <div key={i} className="grid grid-cols-2 border-t border-border">
              <div className="py-5 pr-4 sm:pr-8">
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">
                  {row.label}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground line-through decoration-muted-foreground/30">
                  {row.before}
                </p>
              </div>
              <div className="border-l border-border py-5 pl-4 sm:pl-8">
                <p className="text-[10px] uppercase tracking-[0.16em] text-primary/70">
                  {row.label}
                </p>
                <p className="mt-1.5 text-sm font-medium leading-relaxed">{row.after}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
