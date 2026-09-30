import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Logo } from "../Logo";
import { Button } from "../ui/Button";
import { cn } from "../../lib/utils";
import { useAuth } from "../../context/AuthContext";

export function PublicHeader({ signedIn }: { signedIn?: boolean }) {
  const { user } = useAuth();
  const isAuth = signedIn !== undefined ? signedIn : !!user;
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "relative py-1 font-sans text-[15px] font-medium text-text-secondary transition-colors hover:text-text-primary after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:bg-accent-cyan after:transition-all after:duration-150",
      isActive
        ? "text-text-primary after:w-full"
        : "after:w-0 hover:after:w-full",
    );

  return (
    <header
      className={cn(
        "sticky top-0 z-sticky h-[72px] border-b border-border-hairline transition-colors duration-200",
        scrolled ? "bg-bg-canvas/85 backdrop-blur-md" : "bg-bg-canvas",
      )}
    >
      <div className="flex h-full w-full items-center justify-between px-4 sm:px-8">
        <Link to={isAuth ? "/dashboard" : "/login"}>
          <Logo size={26} />
        </Link>
        <nav className="hidden items-center gap-8 lg:flex">
          {isAuth && (
            <NavLink to="/dashboard" className={navLinkClass}>
              Dashboard
            </NavLink>
          )}
          <NavLink to="/rules" className={navLinkClass}>
            Rules
          </NavLink>
          {isAuth && (
            <NavLink to="/leaderboard" className={navLinkClass}>
              Leaderboard
            </NavLink>
          )}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          {isAuth ? (
            <Button to="/dashboard" variant="secondary" size="sm">
              Dashboard
            </Button>
          ) : (
            <Button to="/login" variant="secondary" size="sm">
              Log in
            </Button>
          )}
          <Button to={isAuth ? "/dashboard" : "/login"} variant="primary" size="sm" chamfer>
            Enter the arena
          </Button>
        </div>
        <button
          className="flex h-11 w-11 items-center justify-center text-text-primary lg:hidden"
          aria-label="Open menu"
          onClick={() => setMenuOpen(true)}
        >
          <Menu size={24} />
        </button>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-dropdown flex flex-col bg-bg-canvas p-6 lg:hidden">
          <div className="flex items-center justify-between">
            <Logo size={26} />
            <button
              className="flex h-11 w-11 items-center justify-center text-text-primary"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
            >
              <X size={24} />
            </button>
          </div>
          <nav className="mt-10 flex flex-col divide-y divide-border-hairline">
            <Link
              to="/rules"
              className="flex h-14 items-center font-sans text-lg text-text-primary"
              onClick={() => setMenuOpen(false)}
            >
              Rules
            </Link>
            <Link
              to="/login"
              className="flex h-14 items-center font-sans text-lg text-text-primary"
              onClick={() => setMenuOpen(false)}
            >
              Log in
            </Link>
          </nav>
          <div className="mt-auto">
            <Button
              to={signedIn ? "/dashboard" : "/login"}
              onClick={() => setMenuOpen(false)}
              variant="primary"
              size="lg"
              chamfer
              fullWidth
            >
              Enter the arena
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
