import React, { useState } from 'react';
import { NavLink } from '@/components/NavLink';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { LanguageSelector } from '@/components/LanguageSelector';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscriptionContext } from '@/contexts/SubscriptionContext';
import { 
  Utensils, 
  LayoutDashboard, 
  FileText, 
  QrCode, 
  BarChart3, 
  Settings, 
  CreditCard,
  LogOut,
  Crown,
  Sparkles
} from 'lucide-react';

export function DashboardSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { plan, isPremium, loading } = useSubscriptionContext();
  const { t } = useTranslation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
      // Pequeño delay antes de navegar
      await new Promise(resolve => setTimeout(resolve, 200));
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error logging out:', error);
      setIsLoggingOut(false);
    }
  };

  const navItems = [
    { title: t('dashboard.title'), url: '/dashboard', icon: LayoutDashboard },
    { title: t('dashboard.menuEditor'), url: '/dashboard/editor', icon: FileText },
    { title: t('dashboard.qrCode'), url: '/dashboard/qr', icon: QrCode },
    { title: t('dashboard.analytics'), url: '/dashboard/analytics', icon: BarChart3 },
    { title: t('dashboard.settings'), url: '/dashboard/settings', icon: Settings },
    { title: t('dashboard.billing'), url: '/dashboard/billing', icon: CreditCard },
  ];

  const planLabel = plan === 'lifetime' ? 'Myotragus' : 
                    plan === 'pro_annual' ? 'Ferreret anual' : 
                    plan === 'pro_monthly' ? 'Ferreret mensual' : 'Sargantana';

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-20 w-20 items-center justify-center rounded-lg ">
            <img src="/logo.png" alt="SaCarta Logo"/>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end={item.url === '/dashboard'}
                      className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-300 hover:text-white transition-colors"
                      activeClassName="bg-primary text-white font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-3">
        {/* Language Selector */}
        <div className={!collapsed ? "block" : "hidden"}>
          <LanguageSelector className="w-full" />
        </div>

        {/* Plan Badge */}
        {!loading && (
          <Link to="/dashboard/billing" className="block">
            <div className={`
              flex items-center gap-2 px-3 py-2 rounded-lg border transition-all
              ${isPremium 
                ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30 hover:border-amber-500/50' 
                : 'bg-muted/50 border-border hover:border-primary/30 hover:bg-muted'
              }
            `}>
              {isPremium ? (
                <Crown className="h-4 w-4 text-amber-500 shrink-0" />
              ) : (
                <Sparkles className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm font-medium ${isPremium ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
                      {planLabel}
                    </span>
                  </div>
                  {!isPremium && (
                    <p className="text-[10px] text-muted-foreground truncate">
                      {t('dashboard.unlockAllFeatures')}
                    </p>
                  )}
                </div>
              )}
            </div>
          </Link>
        )}

        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3" 
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>{isLoggingOut ? t('dashboard.closingSession') : t('auth.signOut')}</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}