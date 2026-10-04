import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { useBlocker, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useEvent } from "../../context/EventContext";
import { useMe } from "../../context/MeContext";
import { CompetitionScreenGuard, useCompetitionScreenGuard } from "./CompetitionScreenGuard";
import { usePolicyRiskLog } from "./usePolicyRiskLog";

const isChallengePath = (pathname: string) => pathname === "/arena" || pathname === "/questions";

function NavigationWarning({ blocker }: { blocker: ReturnType<typeof useBlocker> }) {
  const { askToReturn } = useCompetitionScreenGuard();
  useEffect(() => {
    if (blocker.state === "blocked") askToReturn("navigation");
  }, [blocker.state, askToReturn]);
  return null;
}

/** The guard stays mounted while students switch between questions and the editor. */
export function CompetitionPolicy({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { user, role, approvalStatus } = useAuth();
  const logViolation = usePolicyRiskLog(user?.id ?? null);
  const event = useEvent();
  const { me, refresh } = useMe();
  const leaving = useRef(false);
  const inChallenge = isChallengePath(pathname);
  const enabled = !!user && role === "participant" && approvalStatus === "approved"
    && event.status === "live" && inChallenge && me?.participation?.status !== "finished";

  useEffect(() => {
    leaving.current = false;
    if (inChallenge) void refresh();
  }, [inChallenge, pathname, refresh]);

  const shouldBlock = useCallback(({ nextLocation }: { nextLocation: { pathname: string } }) =>
    enabled && !leaving.current && !isChallengePath(nextLocation.pathname),
  [enabled]);
  const blocker = useBlocker(shouldBlock);

  return (
    <CompetitionScreenGuard
      enabled={enabled}
      onAllowNavigation={() => { leaving.current = true; }}
      onReturn={() => { if (blocker.state === "blocked") blocker.reset(); }}
      onViolation={logViolation}
    >
      <NavigationWarning blocker={blocker} />
      {children}
    </CompetitionScreenGuard>
  );
}
