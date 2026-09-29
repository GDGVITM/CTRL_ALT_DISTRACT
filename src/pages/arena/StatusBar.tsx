export function StatusBar({ connection = "Connected" }: { connection?: string }) {
  return (
    <div className="hidden h-7 items-center gap-6 border-t border-border-hairline bg-bg-base px-4 font-mono text-xs text-text-muted sm:flex">
      <span>● {connection}</span>
      <span>Python</span>
      <span>Ln 3, Col 9</span>
      <span>Saved locally</span>
      <span className="ml-auto">Ctrl+' Run · Ctrl+Enter Submit</span>
    </div>
  );
}
