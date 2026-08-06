import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Premium AI preparation flow shown right after onboarding or an AI import.
 * Builds anticipation before dropping the user into the polished dashboard.
 * Plan: docs/HACKATHON_POLISH_PLAN.md - Task 6.
 */
interface AiWelcomeSequenceProps {
  open: boolean;
  onDone: () => void;
}

const STEP_KEYS = [
  'dashboard.welcome.preparing',
  'dashboard.welcome.understanding',
  'dashboard.welcome.categories',
  'dashboard.welcome.descriptions',
  'dashboard.welcome.translating',
  'dashboard.welcome.almostReady',
] as const;

const WORK_MS = 750;
const DONE_MS = 450;
const FINISH_MS = 1300;

export function AiWelcomeSequence({ open, onDone }: AiWelcomeSequenceProps) {
  const { t } = useTranslation();
  const [reduced, setReduced] = useState(false);
  const [step, setStep] = useState(0);
  const [working, setWorking] = useState(true);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const steps = useMemo(
    () => (reduced ? STEP_KEYS.slice(0, 2) : STEP_KEYS),
    [reduced],
  );

  // Reset when opened.
  useEffect(() => {
    if (open) {
      setStep(0);
      setWorking(true);
      setFinished(false);
    }
  }, [open]);

  // Sequence driver.
  useEffect(() => {
    if (!open) return;

    if (finished) {
      const id = setTimeout(onDone, FINISH_MS);
      return () => clearTimeout(id);
    }

    if (working) {
      const id = setTimeout(() => setWorking(false), WORK_MS);
      return () => clearTimeout(id);
    }

    // Done showing current step → advance.
    if (step >= steps.length - 1) {
      const id = setTimeout(() => setFinished(true), DONE_MS);
      return () => clearTimeout(id);
    }

    const id = setTimeout(() => {
      setStep((s) => s + 1);
      setWorking(true);
    }, DONE_MS);
    return () => clearTimeout(id);
  }, [open, finished, working, step, steps, onDone]);

  if (!open) return null;

  const showFinished = finished || reduced;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md space-y-8 px-6">
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h2 className="font-display text-3xl font-bold">{t('dashboard.welcome.title')}</h2>
        </div>

        <ul className="space-y-3">
          {steps.map((key, i) => {
            const active = !showFinished && i === step;
            const done = showFinished || i < step || (i === step && !working);
            return (
              <li
                key={key}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-all ${
                  active ? 'border-primary/40 bg-primary/5' : 'border-transparent'
                }`}
              >
                {done ? (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                    <Check className="h-4 w-4" />
                  </span>
                ) : (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </span>
                )}
                <span className={done ? 'text-foreground' : 'text-foreground'}>{t(key)}</span>
              </li>
            );
          })}
        </ul>

        {showFinished && (
          <p className="text-center font-medium text-primary">{t('dashboard.welcome.finished')}</p>
        )}

        <div className="text-center">
          <Button variant="ghost" size="sm" onClick={onDone} className="text-muted-foreground">
            <X className="mr-1.5 h-3.5 w-3.5" />
            {t('dashboard.welcome.skip')}
          </Button>
        </div>
      </div>
    </div>
  );
}
