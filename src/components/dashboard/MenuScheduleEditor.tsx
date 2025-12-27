import { useState, useEffect, useMemo } from 'react';
import { ScheduleRule } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Plus, Trash2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

interface MenuScheduleEditorProps {
  scheduleRules: ScheduleRule[] | null;
  onChange: (rules: ScheduleRule[] | null) => void;
  disabled?: boolean;
}

export function MenuScheduleEditor({ scheduleRules, onChange, disabled }: MenuScheduleEditorProps) {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState<boolean>(scheduleRules !== null && scheduleRules.length > 0);
  const [rules, setRules] = useState<ScheduleRule[]>(scheduleRules || []);

  const DAYS = useMemo(() => [
    { value: 0, label: t('schedule.daysShort.0') },
    { value: 1, label: t('schedule.daysShort.1') },
    { value: 2, label: t('schedule.daysShort.2') },
    { value: 3, label: t('schedule.daysShort.3') },
    { value: 4, label: t('schedule.daysShort.4') },
    { value: 5, label: t('schedule.daysShort.5') },
    { value: 6, label: t('schedule.daysShort.6') },
  ], [t]);

  useEffect(() => {
    if (scheduleRules) {
      setRules(scheduleRules);
      setEnabled(scheduleRules.length > 0);
    }
  }, [scheduleRules]);

  const handleToggleEnabled = (checked: boolean) => {
    setEnabled(checked);
    if (!checked) {
      onChange(null);
    } else if (rules.length === 0) {
      const defaultRule: ScheduleRule = { days: [1, 2, 3, 4, 5], start_time: '12:00', end_time: '23:00' };
      setRules([defaultRule]);
      onChange([defaultRule]);
    } else {
      onChange(rules);
    }
  };

  const addRule = () => {
    const newRule: ScheduleRule = { days: [1, 2, 3, 4, 5], start_time: '12:00', end_time: '23:00' };
    const newRules = [...rules, newRule];
    setRules(newRules);
    onChange(newRules);
  };

  const removeRule = (index: number) => {
    const newRules = rules.filter((_, i) => i !== index);
    setRules(newRules);
    onChange(newRules.length > 0 ? newRules : null);
    if (newRules.length === 0) {
      setEnabled(false);
    }
  };

  const updateRule = (index: number, updates: Partial<ScheduleRule>) => {
    const newRules = rules.map((rule, i) => (i === index ? { ...rule, ...updates } : rule));
    setRules(newRules);
    onChange(newRules);
  };

  const toggleDay = (ruleIndex: number, day: number) => {
    const rule = rules[ruleIndex];
    const days = rule.days.includes(day)
      ? rule.days.filter(d => d !== day)
      : [...rule.days, day].sort((a, b) => a - b);
    updateRule(ruleIndex, { days });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <Label>{t('schedule.title')}</Label>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={handleToggleEnabled}
          disabled={disabled}
        />
      </div>

      {enabled && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t('schedule.description')}
          </p>

          {rules.map((rule, index) => (
            <Card key={index} className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t('schedule.rule', { index: index + 1 })}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRule(index)}
                  disabled={disabled}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">{t('schedule.days')}</Label>
                <div className="flex flex-wrap gap-1">
                  {DAYS.map(day => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleDay(index, day.value)}
                      disabled={disabled}
                      className={cn(
                        'px-3 py-1.5 text-xs rounded-full border transition-colors',
                        rule.days.includes(day.value)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted text-muted-foreground border-border hover:border-primary/50'
                      )}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t('schedule.startTime')}</Label>
                  <Input
                    type="time"
                    value={rule.start_time}
                    onChange={e => updateRule(index, { start_time: e.target.value })}
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t('schedule.endTime')}</Label>
                  <Input
                    type="time"
                    value={rule.end_time}
                    onChange={e => updateRule(index, { end_time: e.target.value })}
                    disabled={disabled}
                  />
                </div>
              </div>
            </Card>
          ))}

          <Button
            variant="outline"
            className="w-full"
            onClick={addRule}
            disabled={disabled}
          >
            <Plus className="mr-2 h-4 w-4" /> {t('schedule.addRule')}
          </Button>
        </div>
      )}
    </div>
  );
}

// Helper function to check if a menu is currently available
export function isMenuAvailable(scheduleRules: ScheduleRule[] | null): boolean {
  if (!scheduleRules || scheduleRules.length === 0) {
    return true; // No schedule means always available
  }

  const now = new Date();
  const currentDay = now.getDay(); // 0-6, Sunday to Saturday
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  return scheduleRules.some(rule => {
    if (!rule.days.includes(currentDay)) {
      return false;
    }

    // Handle overnight schedules (e.g., 22:00 to 02:00)
    if (rule.end_time < rule.start_time) {
      return currentTime >= rule.start_time || currentTime <= rule.end_time;
    }

    return currentTime >= rule.start_time && currentTime <= rule.end_time;
  });
}
