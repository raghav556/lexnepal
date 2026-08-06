type AuthErrorLike = {
  message?: string;
  status?: number;
  code?: string;
};

function readAuthError(error: unknown): AuthErrorLike {
  if (!error || typeof error !== "object") return { message: String(error ?? "Sign-in failed") };
  const record = error as Record<string, unknown>;
  const nested = record.error;
  if (nested && typeof nested === "object") {
    const inner = nested as Record<string, unknown>;
    return {
      message: typeof inner.message === "string" ? inner.message : undefined,
      status: typeof inner.status === "number" ? inner.status : undefined,
      code: typeof inner.code === "string" ? inner.code : undefined,
    };
  }
  return {
    message: typeof record.message === "string" ? record.message : undefined,
    status: typeof record.status === "number" ? record.status : undefined,
    code: typeof record.code === "string" ? record.code : undefined,
  };
}

/** Map Better Auth / rate-limit / lockout responses to user-facing copy. */
export function formatSignInError(error: unknown): string {
  const { message = "Sign-in failed", status, code } = readAuthError(error);
  const haystack = `${code ?? ""} ${message}`.toLowerCase();

  if (status === 429 || haystack.includes("too many") || haystack.includes("rate limit")) {
    return "Too many sign-in attempts. Please wait a minute and try again.";
  }
  if (
    haystack.includes("temporarily locked") ||
    haystack.includes("account_temporarily_locked") ||
    haystack.includes("locked until")
  ) {
    return "Your account is temporarily locked after too many failed attempts. Try again in about 15 minutes.";
  }
  if (haystack.includes("invalid email or password") || haystack.includes("invalid_email_or_password")) {
    return "Incorrect email or password. Check your credentials or use Forgot password.";
  }
  if (haystack.includes("email not verified") || haystack.includes("email_not_verified")) {
    return "Verify your email address before signing in. Check your inbox for a verification link.";
  }
  return message;
}
