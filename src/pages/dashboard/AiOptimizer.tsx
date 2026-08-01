import { useOutletContext } from 'react-router-dom';
import { Restaurant } from '@/types/database';
import { useAiOptimizer } from '@/hooks/useAiOptimizer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ChartContainer } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { Sparkles, Wand2 } from 'lucide-react';
import type { OptimizerBreakdown } from '@ai/optimizer';

const DIMENSION_LABELS: Record<keyof OptimizerBreakdown, string> = {
  balance: 'Equilibrio del menú',
  priceDistribution: 'Distribución de precios',
  descriptionQuality: 'Calidad de descripciones',
  imageCoverage: 'Cobertura de fotos',
  languageCoverage: 'Cobertura de idiomas',
  categoryQuality: 'Calidad de categorías',
  menuLength: 'Longitud del menú',
  duplicates: 'Duplicados',
};

function scoreColorClass(score: number) {
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-destructive';
}

export default function AiOptimizer() {
  const { restaurant } = useOutletContext<{ restaurant: Restaurant }>();
  const { run, loading, error, latestResult, history, historyLoading } = useAiOptimizer(restaurant?.id);

  if (historyLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  const chartData = [...history]
    .reverse()
    .map((h) => ({ date: new Date(h.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }), score: h.score }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Optimizador de menú IA</h2>
          <p className="text-muted-foreground">Analiza tu menú y descubre cómo mejorarlo.</p>
        </div>
        <Button onClick={() => run()} disabled={loading} className="gap-2">
          {loading ? <Sparkles className="h-4 w-4 animate-pulse" /> : <Wand2 className="h-4 w-4" />}
          {loading ? 'Analizando...' : 'Analizar menú'}
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/50">
          <CardContent className="pt-6 text-sm text-destructive">{error.message}</CardContent>
        </Card>
      )}

      {!latestResult ? (
        <Card>
          <CardContent className="pt-6 text-center py-12 space-y-3">
            <Wand2 className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="font-medium">Todavía no has analizado tu menú</p>
            <p className="text-sm text-muted-foreground">
              Pulsa "Analizar menú" para obtener una puntuación de 0 a 100 y recomendaciones concretas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Puntuación global</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-5xl font-bold ${scoreColorClass(latestResult.score)}`}>{latestResult.score}</p>
                <p className="text-sm text-muted-foreground mt-1">/ 100</p>
              </CardContent>
            </Card>

            {chartData.length > 1 && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground">Evolución</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={{ score: { label: 'Puntuación', color: 'hsl(var(--primary))' } }} className="h-[140px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} width={30} />
                        <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {(Object.keys(DIMENSION_LABELS) as (keyof OptimizerBreakdown)[]).map((key) => {
              const dim = latestResult.breakdown[key];
              return (
                <Card key={key}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{DIMENSION_LABELS[key]}</CardTitle>
                    <CardDescription className={`text-2xl font-bold ${scoreColorClass(dim.score)}`}>{dim.score}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{dim.note}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {latestResult.topRecommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recomendaciones principales</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {latestResult.topRecommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
