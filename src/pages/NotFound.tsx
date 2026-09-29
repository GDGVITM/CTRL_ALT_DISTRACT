import { ArcadeSides } from "../components/ArcadeSides";
import { PublicHeader } from "../components/headers/PublicHeader";
import { Button } from "../components/ui/Button";

export default function NotFound() {
  return (
    <div className="crt-grid flex min-h-screen flex-col bg-bg-canvas">
      <ArcadeSides contentMax={720} />
      <div className="crt-vignette pointer-events-none fixed inset-0 -z-10" aria-hidden="true" />
      <PublicHeader />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        <span className="font-display text-7xl text-accent-yellow sm:text-8xl">404</span>
        <h1 className="mt-8 font-display text-2xl text-text-primary sm:text-4xl">
          LEVEL NOT FOUND
        </h1>
        <p className="mt-4 font-body text-text-secondary">This page doesn't exist.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button to="/dashboard" variant="primary" chamfer size="lg">
              Go to dashboard
            </Button>
          <Button to="/login" variant="secondary" size="lg">
              Go to login
            </Button>
        </div>
      </main>
    </div>
  );
}
