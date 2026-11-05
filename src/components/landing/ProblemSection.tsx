import { useTranslation } from '@/hooks/useTranslation';

export function ProblemSection() {
  const { t, tRaw } = useTranslation();
  const cards = (tRaw('problem.cards') ?? []) as Array<{ title: string; desc: string }>;

  return (
    <section className="border-b border-border/70 py-20 lg:py-28">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 lg:grid-cols-12 lg:gap-16 lg:px-8">
        <div className="lg:col-span-4">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            {t('problem.kicker')}
          </p>
          <h2 className="font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl">
            {t('problem.title')}
          </h2>
          <p className="mt-6 max-w-sm text-lg leading-relaxed text-muted-foreground">
            {t('problem.subtitle')}
          </p>
        </div>

        <div className="lg:col-span-8">
          <dl className="border-t border-border">
            {cards.map((card, i) => (
              <div
                key={i}
                className="grid gap-4 border-b border-border py-8 sm:grid-cols-[4rem_1fr] sm:gap-8"
              >
                <dt className="font-display text-2xl tabular-nums text-primary/80">
                  {String(i + 1).padStart(2, '0')}
                </dt>
                <dd>
                  <p className="font-display text-2xl font-medium tracking-tight">{card.title}</p>
                  <p className="mt-2 max-w-xl text-base leading-relaxed text-muted-foreground">
                    {card.desc}
                  </p>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
