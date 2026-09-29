import { PublicHeader } from "../components/headers/PublicHeader";
import { Footer } from "../components/Footer";
import { Rulebook } from "../components/Rulebook";

export default function Rules() {
  return (
    <div className="min-h-screen bg-bg-canvas">
      <PublicHeader />
      <main className="mx-auto max-w-[1280px] px-4 py-12 sm:px-8 sm:py-16">
        <h1 className="font-sans text-4xl font-bold text-text-primary sm:text-5xl">
          Rulebook
        </h1>
        <p className="mt-3 max-w-[60ch] font-body text-text-secondary">
          Everything you need to know before you step into the arena.
        </p>
        <div className="mt-10">
          <Rulebook scrollable={false} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
