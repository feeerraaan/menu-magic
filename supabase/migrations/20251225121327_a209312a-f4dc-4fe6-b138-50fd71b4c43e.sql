-- Add explicit RLS policies for subscriptions table to prevent direct INSERT/DELETE by authenticated users
-- Only service role (via edge functions) should create/delete subscriptions

-- Prevent authenticated users from creating subscriptions directly
CREATE POLICY "No direct subscription creation" ON public.subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (false);

-- Prevent authenticated users from deleting subscriptions directly  
CREATE POLICY "No direct subscription deletion" ON public.subscriptions
  FOR DELETE TO authenticated
  USING (false);