-- Allow fullscreen / focus policy incidents to reach the admin review feed.
-- This is an alert only: participation, scores, and submissions are unchanged.
ALTER TABLE public.proctor_events
    DROP CONSTRAINT IF EXISTS proctor_events_type_check;

ALTER TABLE public.proctor_events
    ADD CONSTRAINT proctor_events_type_check
    CHECK (type IN (
        'TAB_SWITCH', 'FULLSCREEN_EXIT', 'PASTE_BLOCKED',
        'MULTI_SESSION', 'DISCONNECT', 'RISK_CHEATING'
    ));
