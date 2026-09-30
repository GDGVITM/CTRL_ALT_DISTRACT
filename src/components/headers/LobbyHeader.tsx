import { Logo } from "../Logo";
import { StatusBadge } from "../ui/Badge";
import { PLAYER } from "../../lib/data";

export function LobbyHeader() {
  return (
    <header className="h-16 border-b border-border-hairline bg-bg-canvas">
      <div className="flex h-full w-full items-center justify-between px-4 sm:px-8">
        <Logo size={26} />
        <div className="flex items-center gap-4">
          <StatusBadge tone="cyan" icon="●">
            Lobby
          </StatusBadge>
          <span className="flex h-8 w-8 items-center justify-center rounded-xs bg-accent-cyan/15 font-mono text-xs font-bold text-accent-cyan">
            {PLAYER.initials}
          </span>
        </div>
      </div>
    </header>
  );
}
