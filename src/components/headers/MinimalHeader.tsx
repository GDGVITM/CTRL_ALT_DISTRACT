import { Logo } from "../Logo";

export function MinimalHeader() {
  return (
    <header className="flex h-16 items-center justify-center border-b border-border-hairline bg-bg-canvas px-4 sm:justify-start sm:px-8">
      <Logo size={26} />
    </header>
  );
}
