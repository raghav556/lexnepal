import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "@/client/navigation";
import { localAuthClient } from "@/client/auth/local-auth-client";
import { AUTH_IDLE_TIMEOUT, AUTH_REDIRECT_REASON_KEY, AUTH_SESSION_EXPIRED } from "@/client/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PREMIUM_EASE } from "@/components/ui/animations";
import { getPortalForRole, STAFF_ROLES, type UserRole } from "@/hooks/use-current-user";
import {
  PORTAL_DESCRIPTIONS,
  PORTAL_HOME,
  PORTAL_INTENTS,
  PORTAL_LABELS,
  parsePortalIntent,
  type PortalIntent,
} from "@/shared/auth/portal-intent";
import { formatSignInError } from "@/shared/auth/sign-in-errors";
import { toast } from "sonner";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  Briefcase,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Scale,
  Shield,
  ShieldCheck,
  Smartphone,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

const DEMO_EMAILS: Record<PortalIntent, string> = {
  admin: "e2e-admin@example.invalid",
  staff: "e2e-staff@example.invalid",
  client: "e2e-client@example.invalid",
};

const PORTAL_ICONS: Record<PortalIntent, typeof UserRound> = {
  client: UserRound,
  staff: Briefcase,
  admin: Shield,
};

function safeNextPath(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("://")) return null;
  return raw;
}

function destinationForRole(role: UserRole, next: string | null): string {
  const home = getPortalForRole(role);
  if (!next) return home;
  if (next === "/admin" || next.startsWith("/admin/")) return role === "admin" ? next : home;
  if (next === "/staff" || next.startsWith("/staff/")) return STAFF_ROLES.includes(role) ? next : home;
  if (next === "/client" || next.startsWith("/client/")) return role === "client" ? next : home;
  return home;
}

export default function SignInPage() {
  const navigate = useNavigate();
  const routeParams = useParams<{ portal?: string }>();
  const [params] = useSearchParams();
  const explicitNext = useMemo(() => safeNextPath(params.get("next")), [params]);
  const activePortal = useMemo(() => {
    return parsePortalIntent(routeParams.portal) ?? parsePortalIntent(params.get("portal")) ?? "client";
  }, [routeParams.portal, params]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showLocalAccounts, setShowLocalAccounts] = useState(false);

  useEffect(() => {
    const host = window.location.hostname;
    const localHost = host === "localhost" || host === "127.0.0.1";
    const hideDemo = process.env.NEXT_PUBLIC_HIDE_DEMO_ACCOUNTS === "1";
    const isProduction = process.env.NODE_ENV === "production";
    setShowLocalAccounts(localHost && !isProduction && !hideDemo);
  }, []);

  useEffect(() => {
    const reason = sessionStorage.getItem(AUTH_REDIRECT_REASON_KEY);
    if (reason === AUTH_SESSION_EXPIRED) {
      sessionStorage.removeItem(AUTH_REDIRECT_REASON_KEY);
      toast.message("Your session expired. Please sign in again.");
      return;
    }
    if (reason === AUTH_IDLE_TIMEOUT) {
      sessionStorage.removeItem(AUTH_REDIRECT_REASON_KEY);
      toast.message("You were signed out after a period of inactivity.");
    }
  }, []);

  const selectPortal = (portal: PortalIntent) => {
    const qs = params.toString();
    navigate(`/sign-in/${portal}${qs ? `?${qs}` : ""}`, { replace: true });
  };

  const portalSignInHref = (portal: PortalIntent) => {
    const qs = params.toString();
    return `/sign-in/${portal}${qs ? `?${qs}` : ""}`;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (needsTwoFactor) {
        const result = await localAuthClient.twoFactor.verifyTotp({ code, trustDevice: false });
        if (result.error) throw result.error;
      } else {
        const result = await localAuthClient.signIn.email({ email, password, rememberMe });
        if (result.error) throw result.error;
        if ((result.data as typeof result.data & { twoFactorRedirect?: boolean })?.twoFactorRedirect) {
          setNeedsTwoFactor(true);
          return;
        }
      }
      const response = await fetch("/api/v1/auth/session", { credentials: "include" });
      const session = await response.json();
      if (!response.ok && session.error?.details?.reason === "MFA_ENROLLMENT_REQUIRED") {
        const next = explicitNext ? `?next=${encodeURIComponent(explicitNext)}` : "";
        navigate(`/mfa-enroll${next}`);
        return;
      }
      if (!response.ok) throw new Error(session.error?.message ?? "Session could not be established");
      const role = session.data?.user?.role as UserRole | undefined;
      if (!role) throw new Error("Session did not include a user role");
      const dest = destinationForRole(role, explicitNext);
      if (explicitNext && dest !== explicitNext) {
        toast.message(`Signed in as ${role.replaceAll("_", " ")} — opening your portal.`);
      }
      // Full navigation so portal layouts mount with a fresh client tree + auth cookie.
      window.location.assign(dest);
    } catch (error) {
      toast.error(formatSignInError(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[oklch(0.97_0.006_80)] text-foreground">
      {/* Ambient wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_10%_20%,oklch(0.32_0.06_265_/_0.08),transparent_55%),radial-gradient(ellipse_50%_40%_at_90%_80%,oklch(0.68_0.12_60_/_0.12),transparent_50%)]"
      />

      <div className="relative grid min-h-dvh lg:grid-cols-2">
        {/* Brand panel — full-bleed on desktop */}
        <motion.aside
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, ease: PREMIUM_EASE }}
          className="relative isolate flex min-h-[42vh] flex-col justify-between overflow-hidden bg-primary px-8 py-10 text-primary-foreground sm:px-12 sm:py-12 lg:min-h-dvh lg:px-14 lg:py-14"
        >
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(145deg,oklch(0.28_0.07_265)_0%,oklch(0.22_0.05_265)_48%,oklch(0.18_0.04_265)_100%)]"
          />
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.14] [background-image:linear-gradient(oklch(0.98_0.004_80_/_0.12)_1px,transparent_1px),linear-gradient(90deg,oklch(0.98_0.004_80_/_0.12)_1px,transparent_1px)] [background-size:48px_48px]"
          />
          <motion.div
            aria-hidden
            className="absolute -right-16 top-1/4 h-72 w-72 rounded-full bg-accent/20 blur-3xl"
            animate={{ opacity: [0.35, 0.55, 0.35], scale: [1, 1.08, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            aria-hidden
            className="absolute -bottom-20 -left-10 h-80 w-80 rounded-full bg-[oklch(0.45_0.08_250_/_0.35)] blur-3xl"
            animate={{ opacity: [0.4, 0.65, 0.4] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />

          <div className="relative z-10">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-primary-foreground/70 transition-colors hover:text-accent"
            >
              <ArrowLeft className="size-4" />
              Back to site
            </Link>

            <div className="mt-10 flex items-center gap-3 sm:mt-14">
              <span className="flex size-11 items-center justify-center rounded-lg border border-accent/40 bg-accent/15 text-accent sm:size-12">
                <Scale className="size-5 sm:size-6" strokeWidth={1.75} />
              </span>
              <div>
                <p className="font-serif text-2xl font-bold tracking-tight text-primary-foreground sm:text-3xl">
                  LexNepal
                </p>
                <p className="text-xs tracking-[0.18em] text-accent uppercase">Legal practice platform</p>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-12 max-w-lg lg:mt-0">
            <motion.h1
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: PREMIUM_EASE, delay: 0.15 }}
              className="font-serif text-3xl leading-[1.15] font-bold text-balance sm:text-4xl lg:text-5xl"
            >
              Secure access to your{" "}
              <span className="text-accent">legal practice</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: PREMIUM_EASE, delay: 0.28 }}
              className="mt-4 max-w-md text-sm leading-relaxed text-primary-foreground/70 sm:text-base"
            >
              Client portals, matter files, and firm operations — protected with encrypted sessions
              and multi-factor authentication.
            </motion.p>

            <motion.ul
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: PREMIUM_EASE, delay: 0.4 }}
              className="mt-8 hidden gap-6 text-sm text-primary-foreground/75 sm:grid sm:grid-cols-2 lg:mt-10"
            >
              <li className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" />
                <span>Session-hardened authentication</span>
              </li>
              <li className="flex items-start gap-3">
                <Lock className="mt-0.5 size-4 shrink-0 text-accent" />
                <span>Encrypted document exchange</span>
              </li>
              <li className="flex items-start gap-3">
                <Smartphone className="mt-0.5 size-4 shrink-0 text-accent" />
                <span>Authenticator MFA support</span>
              </li>
              <li className="flex items-start gap-3">
                <Scale className="mt-0.5 size-4 shrink-0 text-accent" />
                <span>Role-based portal routing</span>
              </li>
            </motion.ul>
          </div>

          <p className="relative z-10 mt-10 text-xs text-primary-foreground/45 lg:mt-0">
            © {new Date().getFullYear()} LexNepal · Kathmandu, Nepal
          </p>
        </motion.aside>

        {/* Auth panel */}
        <section className="relative flex items-center justify-center px-5 py-10 sm:px-10 lg:px-14 lg:py-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, ease: PREMIUM_EASE, delay: 0.12 }}
            className="w-full max-w-[420px]"
          >
            <div className="mb-8 lg:mb-10">
              <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">
                {needsTwoFactor ? "Verification" : "Portal access"}
              </p>
              <h2 className="mt-2 font-serif text-3xl font-bold tracking-tight text-foreground sm:text-[2.15rem]">
                {needsTwoFactor ? "Confirm it’s you" : "Welcome back"}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {needsTwoFactor
                  ? "Enter the 6-digit code from your authenticator app to finish signing in."
                  : explicitNext
                    ? `Sign in with an account that can access ${explicitNext}.`
                    : PORTAL_DESCRIPTIONS[activePortal]}
              </p>

              {!needsTwoFactor ? (
                <div className="mt-5">
                  <div
                    role="tablist"
                    aria-label="Choose portal"
                    className="grid grid-cols-3 gap-1 rounded-xl border border-border/70 bg-secondary/30 p-1"
                  >
                    {PORTAL_INTENTS.map((portal) => {
                      const Icon = PORTAL_ICONS[portal];
                      const selected = activePortal === portal;
                      return (
                        <Link
                          key={portal}
                          href={portalSignInHref(portal)}
                          role="tab"
                          aria-selected={selected}
                          onClick={(event) => {
                            event.preventDefault();
                            selectPortal(portal);
                          }}
                          className={cn(
                            "flex flex-col items-center gap-1 rounded-lg px-2 py-2.5 text-center transition-colors",
                            selected
                              ? "bg-background text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          <Icon className="size-4 shrink-0" aria-hidden />
                          <span className="text-xs font-semibold">{PORTAL_LABELS[portal]}</span>
                        </Link>
                      );
                    })}
                  </div>
                  {!explicitNext ? (
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      After sign-in, you’ll open{" "}
                      <span className="font-medium text-foreground">{PORTAL_HOME[activePortal]}</span>
                    </p>
                  ) : null}
                </div>
              ) : null}

              {!needsTwoFactor && showLocalAccounts ? (
                <div className="mt-4 rounded-lg border border-border/70 bg-secondary/40 px-3 py-3 text-xs leading-relaxed text-muted-foreground">
                  <p className="font-medium text-foreground">
                    Local demo — {PORTAL_LABELS[activePortal]} portal
                  </p>
                  <p className="mt-1">
                    Password: <code className="text-foreground">E2E-Smoke-Only-2026!</code>
                  </p>
                  <p className="mt-2">
                    Email:{" "}
                    <code className="text-foreground">{DEMO_EMAILS[activePortal]}</code>
                  </p>
                </div>
              ) : null}
            </div>

            <AnimatePresence mode="wait">
              <motion.form
                key={needsTwoFactor ? "mfa" : "credentials"}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: PREMIUM_EASE }}
                onSubmit={submit}
                className="space-y-5"
                noValidate
              >
                {needsTwoFactor ? (
                  <div className="space-y-2">
                    <Label htmlFor="code" className="text-sm font-medium">
                      Authenticator code
                    </Label>
                    <Input
                      id="code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      autoFocus
                      maxLength={8}
                      placeholder="000000"
                      value={code}
                      onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 8))}
                      required
                      className="h-12 border-border/80 bg-background/80 font-mono text-lg tracking-[0.35em] shadow-none"
                    />
                    <button
                      type="button"
                      className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                      onClick={() => {
                        setNeedsTwoFactor(false);
                        setCode("");
                      }}
                    >
                      Use a different account
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium">
                        Work email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        autoComplete="username"
                        autoFocus
                        placeholder="you@firm.com"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                        className="h-12 border-border/80 bg-background/80 shadow-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <Label htmlFor="password" className="text-sm font-medium">
                          Password
                        </Label>
                        <Link
                          href="/reset-password"
                          className="text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                        >
                          Forgot password?
                        </Link>
                      </div>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          placeholder="Enter your password"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          required
                          className="h-12 border-border/80 bg-background/80 pr-11 shadow-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </div>

                    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(event) => setRememberMe(event.target.checked)}
                        className="size-4 rounded border-border accent-[oklch(0.32_0.06_265)]"
                      />
                      Keep me signed in on this device
                    </label>
                  </>
                )}

                <Button
                  type="submit"
                  disabled={busy}
                  size="lg"
                  className={cn(
                    "h-12 w-full text-sm font-semibold tracking-wide",
                    "bg-primary text-primary-foreground hover:bg-primary/90",
                    "transition-transform duration-300 hover:-translate-y-0.5 active:translate-y-0",
                  )}
                >
                  {busy ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Please wait…
                    </>
                  ) : needsTwoFactor ? (
                    "Verify & continue"
                  ) : (
                    "Sign in securely"
                  )}
                </Button>
              </motion.form>
            </AnimatePresence>

            <div className="mt-8 border-t border-border/70 pt-6">
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <Link
                  href="/contact"
                  className="text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                >
                  Need access help?
                </Link>
                <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="size-3.5 text-accent" />
                  MFA-ready · Role-gated portals
                </p>
              </div>
            </div>
          </motion.div>
        </section>
      </div>
    </main>
  );
}
