-- Existing accounts retain access; all future participant registrations require review.
ALTER TABLE public.profiles
    ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'approved'
        CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    ADD COLUMN reviewed_at TIMESTAMPTZ,
    ADD COLUMN reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.profiles ALTER COLUMN approval_status SET DEFAULT 'pending';

CREATE INDEX idx_profiles_pending_review
    ON public.profiles (approval_status, created_at DESC) WHERE role = 'participant';

-- The browser can edit display names, but cannot approve itself or change its role.
REVOKE UPDATE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (full_name) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.sync_registration_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    UPDATE auth.users
    SET banned_until = CASE
            WHEN NEW.approval_status = 'approved' OR NEW.role = 'admin' THEN NULL
            ELSE TIMESTAMPTZ '9999-12-31 23:59:59+00'
        END,
        raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
            || jsonb_build_object('role', NEW.role::text, 'approval_status', NEW.approval_status)
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_registration_access_changed
    AFTER INSERT OR UPDATE OF approval_status, role ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.sync_registration_access();
