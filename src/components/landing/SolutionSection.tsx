import { useTranslation } from '@/hooks/useTranslation';

export function SolutionSection() {
  const { t, tRaw } = useTranslation();
  const steps = (tRaw('solution.steps') ?? []) as Array<{ title: string; desc: string }>;

  return (
    <section id="como-funciona" className="border-b border-border/70 bg-secondary/40 py-20 lg:py-28">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 lg:grid-cols-12 lg:gap-16 lg:px-8">
        <div className="lg:col-span-5">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            {t('solution.kicker')}
          </p>
          <h2 className="font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl">
            {t('solution.title')}
          </h2>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
            {t('solution.subtitle')}
          </p>

          <figure className="mt-10">
            <div className="border border-border bg-card p-2 shadow-[0_24px_60px_-40px_rgba(38,28,23,0.45)]">
              <img
                src="/product/ai-import.webp"
                alt={t('solution.steps.1.title')}
                className="w-full"
                loading="lazy"
              />
            </div>
            <figcaption className="mt-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {t('solution.imageCaption')}
            </figcaption>
          </figure>
        </div>

        <ol className="lg:col-span-7 lg:pt-2">
          {steps.map((step, i) => (
            <li
              key={i}
              className="grid grid-cols-[3.5rem_1fr] gap-5 border-t border-border py-7 last:border-b sm:grid-cols-[5rem_1fr] sm:gap-8"
            >
              <span className="font-display text-3xl tabular-nums text-primary/80">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <h3 className="font-display text-xl font-medium tracking-tight sm:text-2xl">
                  {step.title}
                </h3>
                <p className="mt-2 max-w-lg text-base leading-relaxed text-muted-foreground">
                  {step.desc}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
