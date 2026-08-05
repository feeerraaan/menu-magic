import { Outlet } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { DashboardSidebar } from './DashboardSidebar';
import { useRestaurant } from '@/hooks/useRestaurant';
import { OnboardingWizard } from './OnboardingWizard';
import { LoadingPage } from '@/components/ui/loading-spinner';
import { SubscriptionProvider, useSubscriptionContext } from '@/contexts/SubscriptionContext';

export function DashboardLayout() {
  const { restaurant, loading, refetch } = useRestaurant();

  if (loading) {
    return <LoadingPage />;
  }

  // Show onboarding if no restaurant or onboarding not completed
  if (!restaurant || !restaurant.onboarding_completed) {
    return <OnboardingWizard onComplete={refetch} />;
  }

  return (
    <SubscriptionProvider restaurantId={restaurant.id}>
      <SidebarProvider>
        <div className="flex h-svh w-full overflow-hidden">
          <DashboardSidebar />
          <div className="flex flex-1 flex-col min-w-0">
            <header className="h-14 shrink-0 border-b border-border flex items-center px-4 gap-4 bg-card/50 backdrop-blur-sm sticky top-0 z-40">
              <h1 className="font-display text-lg font-semibold truncate">{restaurant.name}</h1>
            </header>
            <main className="flex-1 overflow-y-auto overflow-x-auto p-6 bg-background">
              <Outlet context={{ restaurant }} />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </SubscriptionProvider>
  );
}