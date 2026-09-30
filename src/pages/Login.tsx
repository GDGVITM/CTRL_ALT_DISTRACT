import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Check } from "lucide-react";
import { Logo } from "../components/Logo";
import { Button, PixelSpinner } from "../components/ui/Button";
import { TextInput } from "../components/ui/Input";
import { ArcadeDino } from "../components/ArcadeDino";
import { cn } from "../lib/utils";
import { supabase, getUserProfile } from "../lib/supabase";

type Mode = "sign-in" | "sign-up";
type Status = "idle" | "submitting" | "error" | "success";

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [status, setStatus] = useState<Status>("idle");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const selectedRole = "participant";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    try {
      if (mode === "sign-in") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          setStatus("error");
          setErrorMsg(error.message);
          return;
        }

        if (!data.user) {
          setStatus("error");
          setErrorMsg("Login failed. No user record returned.");
          return;
        }

        setStatus("success");

        // Resolve user role
        const profile = await getUserProfile(data.user.id);
        const resolvedRole = profile?.role || data.user.app_metadata?.role || data.user.user_metadata?.role || "participant";

        setTimeout(() => {
          if (resolvedRole === "admin") {
            navigate("/admin");
          } else {
            navigate("/dashboard");
          }
        }, 500);
      } else {
        // Sign-up mode
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              role: selectedRole,
            },
          },
        });

        if (error) {
          setStatus("error");
          setErrorMsg(error.message);
          return;
        }

        if (!data.user) {
          setStatus("error");
          setErrorMsg("Registration failed. Please try again.");
          return;
        }

        setStatus("success");

        setTimeout(() => {
          navigate("/dashboard");
        }, 500);
      }
    } catch (err: unknown) {
      console.error("Auth error:", err);
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred.");
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Left visual */}
      <div className="crt-grid crt-scanlines relative hidden border-r border-border-hairline bg-bg-canvas p-6 xl:p-10 lg:flex" aria-hidden="true">
        <div className="flex w-full items-center">
          <ArcadeDino busy={status === "submitting"} />
        </div>
      </div>
      <div className="crt-grid relative flex h-40 items-center justify-center border-b border-border-hairline bg-bg-canvas lg:hidden" aria-hidden="true">
        <Logo size={40} wordmark={false} />
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center bg-bg-base px-6 py-8 sm:px-10">
        <div className="w-full max-w-[400px]">
          <div className="mb-4 hidden lg:block">
            <Logo size={32} wordmark={false} />
          </div>

          <h1 className="font-sans text-2xl font-bold text-text-primary sm:text-3xl">
            {mode === "sign-in" ? "Welcome, player." : "Create your player."}
          </h1>
          <p className="mt-1 font-body text-xs sm:text-sm text-text-secondary">
            {mode === "sign-in"
              ? "Sign in to join Ctrl Alt Distract."
              : "Set up your profile to enter the arena."}
          </p>

          {status === "error" && (
            <div
              role="alert"
              className="mt-3 flex items-start gap-2 border border-danger/40 bg-fill-danger px-3 py-2 font-body text-xs text-danger"
            >
              <span>✕</span>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className={cn("mt-4 flex flex-col gap-3", status === "success" && "opacity-60")}>
            {mode === "sign-up" && (
              <TextInput
                id="full-name"
                label="Full name"
                placeholder="Ada Lovelace"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={status === "submitting"}
              />
            )}

            <TextInput
              id="email-address"
              type="email"
              label="Email"
              placeholder="you@college.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={status === "submitting"}
            />

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label htmlFor="password" className="font-body text-xs sm:text-sm font-medium text-text-primary">
                  Password
                </label>
                {mode === "sign-in" && (
                  <button
                    type="button"
                    onClick={() => alert("Password reset functionality is routed to Supabase Auth.")}
                    className="font-body text-xs text-accent-cyan hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <TextInput
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={status === "submitting"}
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
              size="md"
              fullWidth
              disabled={status === "submitting"}
              className={cn("mt-1", status === "success" ? "bg-success text-black shadow-none" : undefined)}
            >
              {status === "submitting" ? (
                <span className="flex items-center gap-2">
                  <PixelSpinner /> {mode === "sign-in" ? "Signing in…" : "Creating player…"}
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

            <p className="mt-1 text-center font-body text-xs sm:text-sm text-text-secondary">
              {mode === "sign-in" ? (
                <>
                  New here?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("sign-up");
                      setErrorMsg("");
                    }}
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
                    onClick={() => {
                      setMode("sign-in");
                      setErrorMsg("");
                    }}
                    className="text-accent-cyan hover:underline"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
