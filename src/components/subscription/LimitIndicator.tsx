import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { LIMIT_LABELS, type PlanLimits } from '@/lib/subscription-limits';

interface LimitIndicatorProps {
  feature: keyof PlanLimits;
  current: number;
  limit: number;
  showLabel?: boolean;
  showProgress?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function LimitIndicator({
  feature,
  current,
  limit,
  showLabel = true,
  showProgress = true,
  size = 'md',
  className,
}: LimitIndicatorProps) {
  const percentage = limit > 0 ? Math.min(100, (current / limit) * 100) : 100;
  const isAtLimit = current >= limit;
  const isNearLimit = percentage >= 80 && !isAtLimit;

  return (
    <div className={cn('space-y-1', className)}>
      <div className={cn(
        'flex items-center justify-between',
        size === 'sm' ? 'text-xs' : 'text-sm'
      )}>
        {showLabel && (
          <span className="text-muted-foreground">{LIMIT_LABELS[feature]}</span>
        )}
        <span className={cn(
          'font-medium',
          isAtLimit && 'text-destructive',
          isNearLimit && 'text-warning'
        )}>
          {current}/{limit}
        </span>
      </div>
      {showProgress && (
        <Progress 
          value={percentage} 
          className={cn(
            size === 'sm' ? 'h-1' : 'h-2',
            isAtLimit && '[&>div]:bg-destructive',
            isNearLimit && '[&>div]:bg-warning'
          )}
        />
      )}
    </div>
  );
}
