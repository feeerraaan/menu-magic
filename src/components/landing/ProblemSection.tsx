import { Clock, Languages, EyeOff } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

const ICONS = [Clock, Languages, EyeOff];

/** Landing "Problem" section: the time restaurants lose. Task 9. */
export function ProblemSection() {
  const { t, tRaw } = useTranslation();
  const cards = (tRaw('problem.cards') ?? []) as Array<{ title: string; desc: string }>;

  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-display text-4xl font-bold mb-4">{t('problem.title')}</h2>
          <p className="text-muted-foreground text-lg">{t('problem.subtitle')}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {cards.map((card, i) => {
            const Icon = ICONS[i] ?? Clock;
            return (
              <div key={i} className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8">
                <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-destructive/10">
                  <Icon className="h-7 w-7 text-destructive" />
                </div>
                <h3 className="font-display text-xl font-bold mb-3">{card.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{card.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
