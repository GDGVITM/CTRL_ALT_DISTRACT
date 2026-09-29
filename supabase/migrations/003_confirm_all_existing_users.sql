-- Migration: 003_confirm_all_existing_users.sql
-- Description: Mark any pre-existing users as email_confirmed so they can sign in immediately

UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email_confirmed_at IS NULL;
