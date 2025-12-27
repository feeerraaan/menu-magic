-- Add manual_override column to subscriptions table
-- When set to true, the check-subscription function will NOT overwrite the subscription data
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS manual_override boolean NOT NULL DEFAULT false;