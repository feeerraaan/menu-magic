import { Link } from 'react-router-dom';
import { Crown, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

interface UpgradeBannerProps {
  title?: string;
  message: string;
  variant?: 'default' | 'compact' | 'inline';
  className?: string;
}

export function UpgradeBanner({ 
  title,
  message, 
  variant = 'default',
  className 
}: UpgradeBannerProps) {
  const { t } = useTranslation();
  const resolvedTitle = title ?? t('upgrade.title');
  if (variant === 'inline') {
    return (
      <div className={cn(
        'flex items-center gap-2 text-sm text-muted-foreground',
        className
      )}>
        <Crown className="h-4 w-4 text-warning" />
        <span>{message}</span>
        <Link to="/dashboard/billing">
          <Button variant="link" size="sm" className="p-0 h-auto text-primary">
            {t('upgrade.upgrade')} <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </Link>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn(
        'flex items-center justify-between gap-4 p-3 rounded-lg bg-warning/10 border border-warning/20',
        className
      )}>
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-warning" />
          <span className="text-sm">{message}</span>
        </div>
        <Link to="/dashboard/billing">
          <Button variant="outline" size="sm" className="border-warning/30 hover:bg-warning/10">
            {t('upgrade.upgrade')}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className={cn(
      'p-4 rounded-xl bg-gradient-to-r from-warning/10 via-warning/5 to-transparent border border-warning/20',
      className
    )}>
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-warning/20">
          <Crown className="h-5 w-5 text-warning" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground">{resolvedTitle}</h4>
          <p className="text-sm text-muted-foreground mt-1">{message}</p>
        </div>
        <Link to="/dashboard/billing">
          <Button className="bg-warning hover:bg-warning/90 text-warning-foreground">
            {t('upgrade.viewPlans')} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
