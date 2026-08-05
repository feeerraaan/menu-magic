import { Upload, Sparkles, Languages, TrendingUp, type LucideIcon } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

const ICONS: LucideIcon[] = [Upload, Sparkles, Languages, TrendingUp];

/** Landing "How AI solves it" section: upload → build → translate → optimize. Task 9. */
export function SolutionSection() {
  const { t, tRaw } = useTranslation();
  const steps = (tRaw('solution.steps') ?? []) as Array<{ title: string; desc: string }>;

  return (
    <section className="py-24 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-display text-4xl font-bold mb-4">{t('solution.title')}</h2>
          <p className="text-muted-foreground text-lg">{t('solution.subtitle')}</p>
        </div>

        <div className="grid md:grid-cols-4 gap-8">
          {steps.map((step, i) => {
            const Icon = ICONS[i] ?? Sparkles;
            return (
              <div key={i} className="relative">
                {i < steps.length - 1 && (
                  <div className="absolute left-[calc(50%+3rem)] top-7 hidden md:block h-px w-[calc(100%-3rem)] bg-border" />
                )}
                <div className="relative flex flex-col items-center text-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 ring-4 ring-background">
                    <Icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-display text-lg font-bold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
