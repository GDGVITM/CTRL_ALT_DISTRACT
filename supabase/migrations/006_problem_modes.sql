-- Migration: 006_problem_modes.sql
-- Description: Support whole-program (stdin/stdout) problems next to function-style ones.
--   function : the player implements a method of `Solution`; a generated driver feeds every test case.
--   io       : the player writes a complete program; each test case is one run, output is compared.

ALTER TABLE public.problems
    ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'function'
        CHECK (mode IN ('function', 'io'));

-- io problems have no function signature.
ALTER TABLE public.problems ALTER COLUMN signature DROP NOT NULL;
