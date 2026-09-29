-- Migration: 001_create_profiles_and_roles.sql
-- Description: Creates the public.profiles table and automatic trigger to link with auth.users

-- 1. Create user role enum & profiles table
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('participant', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role user_role NOT NULL DEFAULT 'participant',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Users can view their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- Users can update their own display name (but NOT their role)
CREATE POLICY "Users can update own display name" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (
    auth.uid() = id AND 
    role = (SELECT role FROM public.profiles WHERE id = auth.uid())
);

-- 4. Trigger Function: Runs on auth.users INSERT
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    default_role user_role := 'participant';
    requested_role text;
BEGIN
    -- Allow passing role in user_metadata, fallback to 'participant'
    requested_role := NEW.raw_user_meta_data->>'role';
    
    IF requested_role = 'admin' THEN
        default_role := 'admin';
    ELSE
        default_role := 'participant';
    END IF;

    -- Insert into public.profiles
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        default_role
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name;

    -- Sync role into auth.users.raw_app_meta_data so it is baked into the JWT
    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', default_role::text)
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$;

-- 5. Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
