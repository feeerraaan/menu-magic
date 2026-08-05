import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import type { InsightsRecommendation } from '@ai/insights';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';

interface RecommendationsPreviewProps {
  recommendations: InsightsRecommendation[];
}

const MAX_SHOWN = 3;

export function RecommendationsPreview({ recommendations }: RecommendationsPreviewProps) {
  const { t } = useTranslation();
  const shown = recommendations.slice(0, MAX_SHOWN);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-4 w-4 text-primary" />
            {t('dashboard.ov.recs.title')}
          </CardTitle>
          {recommendations.length > 0 && (
            <Badge variant="secondary">{recommendations.length}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {shown.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">{t('dashboard.ov.recs.empty')}</p>
        ) : (
          shown.map((rec) => (
            <Link
              key={rec.id}
              to="/dashboard/analytics"
              className="block rounded-lg border p-3 transition-colors hover:border-primary/50 hover:bg-muted/50"
            >
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                  {rec.category}
                </Badge>
              </div>
              <p className="mt-1.5 text-sm font-medium leading-snug">{rec.title}</p>
              {rec.detail && (
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{rec.detail}</p>
              )}
            </Link>
          ))
        )}
        {recommendations.length > 0 && (
          <Link
            to="/dashboard/analytics"
            className="inline-flex items-center gap-1 pt-1 text-sm font-medium text-primary hover:underline"
          >
            {t('dashboard.ov.recs.viewAll')}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
