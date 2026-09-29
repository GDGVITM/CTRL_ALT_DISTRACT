-- Migration: 002_auto_confirm_users.sql
-- Description: Automatically confirms user email addresses upon sign up so users can log in immediately without waiting for confirmation emails.

CREATE OR REPLACE FUNCTION public.auto_confirm_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.email_confirmed_at := COALESCE(NEW.email_confirmed_at, NOW());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_auto_confirm ON auth.users;
CREATE TRIGGER on_auth_user_auto_confirm
    BEFORE INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_user();
