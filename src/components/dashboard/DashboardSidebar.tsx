import { NavLink } from '@/components/NavLink';
import { Link, useLocation } from 'react-router-dom';
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

const navItems = [
  { title: 'Overview', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Menu Editor', url: '/dashboard/editor', icon: FileText },
  { title: 'QR Code', url: '/dashboard/qr', icon: QrCode },
  { title: 'Analytics', url: '/dashboard/analytics', icon: BarChart3 },
  { title: 'Settings', url: '/dashboard/settings', icon: Settings },
  { title: 'Billing', url: '/dashboard/billing', icon: CreditCard },
];

export function DashboardSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { signOut } = useAuth();
  const location = useLocation();
  const { plan, isPremium, loading } = useSubscriptionContext();

  const planLabel = plan === 'lifetime' ? 'Lifetime' : 
                    plan === 'pro_annual' ? 'Pro Anual' : 
                    plan === 'pro_monthly' ? 'Pro' : 'Free';

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
                    {!isPremium && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        Upgrade
                      </Badge>
                    )}
                  </div>
                  {!isPremium && (
                    <p className="text-[10px] text-muted-foreground truncate">
                      Desbloquea todas las funciones
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
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sign Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}