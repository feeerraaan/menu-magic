import { useOutletContext } from 'react-router-dom';
import { Restaurant } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart3, Eye, Globe, TrendingUp } from 'lucide-react';

export default function Analytics() {
  const { restaurant } = useOutletContext<{ restaurant: Restaurant }>();

  // Placeholder for analytics - would be fetched from menu_views table
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold">Analytics</h2>
        <p className="text-muted-foreground">Track your menu performance</p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Eye className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">Total Views</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{restaurant.supported_languages.length}</p>
                <p className="text-sm text-muted-foreground">Languages</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Placeholder Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Views Over Time
          </CardTitle>
          <CardDescription>Menu views in the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <p>Analytics will appear here once your menu receives views.</p>
          </div>
        </CardContent>
      </Card>

      {/* Top Items Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Most Viewed Items</CardTitle>
          <CardDescription>Items that customers look at most</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center text-muted-foreground">
            <p>No item views recorded yet.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}