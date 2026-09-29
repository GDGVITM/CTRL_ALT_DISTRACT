import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Check } from "lucide-react";
import { Logo } from "../components/Logo";
import { Button, PixelSpinner } from "../components/ui/Button";
import { TextInput } from "../components/ui/Input";
import { ArcadeDino } from "../components/ArcadeDino";
import { cn } from "../lib/utils";

type Mode = "sign-in" | "sign-up";
type Status = "idle" | "submitting" | "error" | "success";

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [status, setStatus] = useState<Status>("idle");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");
    setTimeout(() => {
      setStatus("success");
      setTimeout(() => navigate("/dashboard"), 400);
    }, 900);
  };

  const handleDemoFail = () => {
    setStatus("submitting");
    setTimeout(() => {
      setStatus("error");
      setErrorMsg("Email or password is incorrect. Try again or continue with Google.");
    }, 900);
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Left visual */}
      <div className="crt-grid crt-scanlines relative hidden border-r border-border-hairline bg-bg-canvas p-6 xl:p-10 lg:flex" aria-hidden="true">
        <div className="flex w-full items-center"><ArcadeDino busy={status === "submitting"} /></div>
      </div>
      <div className="crt-grid relative flex h-40 items-center justify-center border-b border-border-hairline bg-bg-canvas lg:hidden" aria-hidden="true">
        <Logo size={40} wordmark={false} />
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center bg-bg-base px-6 py-12 sm:px-10">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 hidden lg:block">
            <Logo size={36} wordmark={false} />
          </div>

          <h1 className="font-sans text-3xl font-bold text-text-primary">
            {mode === "sign-in" ? "Welcome, player." : "Create your player."}
          </h1>
          <p className="mt-2 font-body text-text-secondary">
            {mode === "sign-in"
              ? "Sign in to join Ctrl Alt One."
              : "Set up your profile to enter the arena."}
          </p>

          {status === "error" && (
            <div
              role="alert"
              className="mt-6 flex items-start gap-2 border border-danger/40 bg-fill-danger px-4 py-3 font-body text-sm text-danger"
            >
              <span>✕</span>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className={cn("mt-6 flex flex-col gap-5", status === "success" && "opacity-60")}>
            {mode === "sign-up" && (
              <TextInput label="Full name" placeholder="Your name" required readOnly={status === "submitting"} />
            )}

            <Button
              type="button"
              variant="secondary"
              size="md"
              fullWidth
              icon={
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white font-mono text-[11px] font-bold text-black">
                  G
                </span>
              }
              className="normal-case tracking-normal"
              disabled={status === "submitting"}
            >
              Continue with Google
            </Button>

            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-border-hairline" />
              <span className="font-body text-xs text-text-muted">or</span>
              <span className="h-px flex-1 bg-border-hairline" />
            </div>

            <TextInput
              type="email"
              label="Email"
              placeholder="you@college.edu"
              required
              readOnly={status === "submitting"}
            />

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="font-body text-sm font-medium text-text-primary">
                  Password
                </label>
                {mode === "sign-in" && (
                  <button type="button" className="font-body text-sm text-accent-cyan hover:underline">
                    Forgot password?
                  </button>
                )}
              </div>
              <TextInput
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                required
                readOnly={status === "submitting"}
                trailing={
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((v) => !v)}
                    className="text-text-muted hover:text-text-primary"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }
              />
            </div>

            <Button
              type="submit"
              variant={status === "success" ? undefined : "primary"}
              size="lg"
              fullWidth
              disabled={status === "submitting"}
              className={status === "success" ? "bg-success text-black shadow-none" : undefined}
            >
              {status === "submitting" ? (
                <span className="flex items-center gap-2">
                  <PixelSpinner /> Signing in…
                </span>
              ) : status === "success" ? (
                <span className="flex items-center gap-2">
                  <Check size={18} /> Access granted
                </span>
              ) : mode === "sign-in" ? (
                "Sign in"
              ) : (
                "Create account"
              )}
            </Button>

            <p className="text-center font-body text-sm text-text-secondary">
              {mode === "sign-in" ? (
                <>
                  New here?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("sign-up")}
                    className="text-accent-cyan hover:underline"
                  >
                    Create an account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("sign-in")}
                    className="text-accent-cyan hover:underline"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>

            <button
              type="button"
              onClick={handleDemoFail}
              className="font-body text-xs text-text-muted hover:text-text-secondary"
            >
              (demo) preview a failed sign-in
            </button>
          </form>

          <p className="mt-8 font-body text-xs text-text-muted">
            By continuing you agree to the event rules and code of conduct.
          </p>
        </div>
      </div>
    </div>
  );
}
