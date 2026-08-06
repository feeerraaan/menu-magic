-- Contact form messages (landing page "Contacto"), stored so they arrive in the
-- superadmin backoffice instead of relying on email alone.
--
-- Table is admin-only: no client-facing RLS policies. The public landing form writes
-- through the send-contact Edge Function (service-role), and admins read/manage through
-- the SECURITY DEFINER RPCs below (checked via the pre-existing has_role(auth.uid(), 'admin')).

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- List all contact messages, newest first.
CREATE OR REPLACE FUNCTION public.admin_list_contact_messages()
RETURNS TABLE (
  id uuid,
  name text,
  email text,
  message text,
  is_read boolean,
  created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, name, email, message, is_read, created_at
  FROM public.contact_messages
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY created_at DESC
$$;

-- Mark a message read/unread.
CREATE OR REPLACE FUNCTION public.admin_toggle_contact_message_read(
  _message_id uuid,
  _is_read boolean
)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  UPDATE public.contact_messages SET
    is_read = COALESCE(_is_read, is_read)
  WHERE id = _message_id AND public.has_role(auth.uid(), 'admin')
  RETURNING true
$$;

-- Delete a contact message.
CREATE OR REPLACE FUNCTION public.admin_delete_contact_message(_message_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  DELETE FROM public.contact_messages
  WHERE id = _message_id AND public.has_role(auth.uid(), 'admin')
  RETURNING true
$$;
