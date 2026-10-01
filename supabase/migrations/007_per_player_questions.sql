-- Migration: 007_per_player_questions.sql
-- Description: Every player gets their own random selection (and order) of questions from the pool.
--   participations.problem_order holds problems.id values; round N uses problem_order[N].
--   It is chosen once, when the player joins, and never changes.

ALTER TABLE public.participations
    ADD COLUMN IF NOT EXISTS problem_order INTEGER[] NOT NULL DEFAULT '{}';
