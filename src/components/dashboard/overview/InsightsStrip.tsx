import { Link } from 'react-router-dom';
import { Globe, Languages, Star, TrendingUp, type LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';
import { getLanguageName, type Language } from '@/lib/i18n';

interface Insight {
  icon: LucideIcon;
  text: string;
  to: string;
}

interface InsightsStripProps {
  weekViews: number;
  totalViews: number;
  viewsByLanguage: { language: string; views: number }[];
  topItemName: string | null;
  defaultLanguage: string;
  missingTranslations: number;
  loading: boolean;
}

function languageName(code: string): string {
  try {
    return getLanguageName(code as Language) || code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

const MAX_SHOWN = 3;

/** Deterministic insight cards derived from real analytics + health data. */
export function InsightsStrip({
  weekViews,
  totalViews,
  viewsByLanguage,
  topItemName,
  defaultLanguage,
  missingTranslations,
  loading,
}: InsightsStripProps) {
  const { t } = useTranslation();

  if (loading) return null;

  const insights: Insight[] = [];

  const topForeign = viewsByLanguage.find((v) => v.language && v.language !== defaultLanguage);
  if (topForeign && totalViews > 0) {
    const pct = Math.round((topForeign.views / totalViews) * 100);
    insights.push({
      icon: Globe,
      text: t('dashboard.ov.insights.topLanguage', {
        pct,
        language: languageName(topForeign.language),
      }),
      to: '/dashboard/analytics',
    });
  }

  if (topItemName) {
    insights.push({
      icon: Star,
      text: t('dashboard.ov.insights.topItem', { name: topItemName }),
      to: '/dashboard/analytics',
    });
  }

  if (missingTranslations > 0) {
    insights.push({
      icon: Languages,
      text: t('dashboard.ov.insights.missingTranslations', { count: missingTranslations }),
      to: '/dashboard/editor',
    });
  }

  if (insights.length < MAX_SHOWN && weekViews > 0) {
    insights.push({
      icon: TrendingUp,
      text: t('dashboard.ov.insights.weekViews', { count: weekViews }),
      to: '/dashboard/analytics',
    });
  }

  if (insights.length === 0) return null;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{t('dashboard.ov.insights.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {insights.slice(0, MAX_SHOWN).map((insight, i) => (
          <Link
            key={i}
            to={insight.to}
            className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:border-primary/50 hover:bg-muted/50"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <insight.icon className="h-4 w-4 text-primary" />
            </div>
            <p className="text-sm font-medium leading-snug">{insight.text}</p>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
