import { Logo } from "../Logo";
import { StatusBadge } from "../ui/Badge";
import { PLAYER } from "../../lib/data";
import { useAuth } from "../../context/AuthContext";

export function LobbyHeader() {
  const { user, profile } = useAuth();
  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : PLAYER.initials;

  return (
    <header className="h-16 border-b border-border-hairline bg-bg-canvas">
      <div className="mx-auto flex h-full max-w-[1280px] items-center justify-between px-4 sm:px-8">
        <Logo size={26} />
        <div className="flex items-center gap-4">
          <StatusBadge tone="cyan" icon="●">
            Lobby
          </StatusBadge>
          <span className="flex h-8 w-8 items-center justify-center rounded-xs bg-accent-cyan/15 font-mono text-xs font-bold text-accent-cyan">
            {initials}
          </span>
        </div>
      </div>
    </header>
  );
}
