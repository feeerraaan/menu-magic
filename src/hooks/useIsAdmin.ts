import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Whether the signed-in user holds the 'admin' role. Reads the caller's own user_roles row
// (RLS allows "Users can view own roles"); the backoffice routes are gated with this.
export function useIsAdmin(): { isAdmin: boolean; loading: boolean } {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let disposed = false;
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (disposed) return;
      if (!user) {
        setLoading(false);
        return;
      }
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      if (disposed) return;
      setIsAdmin(!!(roles ?? []).some((r) => r.role === 'admin'));
      setLoading(false);
    };
    void check();
    return () => {
      disposed = true;
    };
  }, []);

  return { isAdmin, loading };
}
