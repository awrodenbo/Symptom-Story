import { parseRecoveryParameters } from "./auth-url.ts";

export type AuthErrorLike = {
  code?: string;
  message?: string;
  status?: number;
} | null;

type AuthResponse = Promise<{ error: AuthErrorLike }>;
type AuthClient = {
  exchangeCodeForSession: (code: string) => AuthResponse;
  resetPasswordForEmail: (
    email: string,
    options: { redirectTo: string },
  ) => AuthResponse;
  setSession: (session: {
    access_token: string;
    refresh_token: string;
  }) => AuthResponse;
  signInWithPassword: (credentials: {
    email: string;
    password: string;
  }) => AuthResponse;
  signOut: (options?: { scope?: 'global' | 'local' | 'others' }) => AuthResponse;
  signUp: (credentials: { email: string; password: string }) => AuthResponse;
  updateUser: (attributes: { password: string }) => AuthResponse;
};

type LinkingAdapter = {
  addEventListener: (
    event: "url",
    callback: (event: { url: string }) => void,
  ) => { remove: () => void };
  createURL: (
    path: string,
    options: { queryParams: Record<string, string> },
  ) => string;
  getInitialURL: () => Promise<string | null>;
};

export type BrowserAdapter = {
  history: {
    replaceState: (data: unknown, unused: string, url?: string | URL | null) => void;
    state: unknown;
  };
  location: { href: string };
};

const RECOVERY_QUERY_KEYS = [
  "access_token",
  "code",
  "error",
  "error_code",
  "error_description",
  "recovery",
  "refresh_token",
  "token_hash",
  "type",
];

export function clearBrowserRecoveryUrl(browser?: BrowserAdapter) {
  if (!browser) return;
  const url = new URL(browser.location.href);
  for (const key of RECOVERY_QUERY_KEYS) url.searchParams.delete(key);
  url.hash = "";
  browser.history.replaceState(
    browser.history.state,
    "",
    `${url.pathname}${url.search}`,
  );
}

export function friendlyAuthError(
  error: AuthErrorLike | unknown,
  context: "request" | "recovery" | "password",
) {
  const details =
    error && typeof error === "object"
      ? (error as Exclude<AuthErrorLike, null>)
      : {};
  const searchable = `${details.code ?? ""} ${details.message ?? ""}`.toLowerCase();

  if (
    details.status === 429 ||
    /rate.?limit|too many requests|over_email_send_rate_limit/.test(searchable)
  )
    return "Too many attempts. Please wait a few minutes and try again.";

  if (/network|failed to fetch|fetch failed|timed? ?out|offline/.test(searchable))
    return "Check your internet connection and try again.";

  if (
    context === "password" &&
    /weak|password.*(short|length|characters)|same password/.test(searchable)
  )
    return "Choose a stronger password that meets all password requirements.";

  if (
    context === "recovery" &&
    /expired|invalid|otp_expired|token|session|access_denied/.test(searchable)
  )
    return "This password reset link is invalid or has expired. Request a new link.";

  if (context === "request")
    return "We couldn’t send the reset email. Please try again.";
  if (context === "password")
    return "We couldn’t update your password. Please try again.";
  return "We couldn’t open this password reset link. Please request a new one.";
}

export function getRecoveryDisplayState({
  hasSession,
  recovering,
  recoveryError,
}: {
  hasSession: boolean;
  recovering: boolean;
  recoveryError: string;
}) {
  if (recoveryError) return hasSession ? "error-with-session" : "error";
  if (recovering) return "password";
  return "app";
}

export function createAuthService({
  auth,
  linking,
  clearRecoveryUrl = () => undefined,
}: {
  auth: AuthClient;
  linking: LinkingAdapter;
  clearRecoveryUrl?: () => void;
}) {
  async function establishRecoverySession(url: string) {
    const parameters = parseRecoveryParameters(url);
    const isRecoveryLink =
      parameters.type === "recovery" || url.includes("recovery=password");

    if (!isRecoveryLink) return false;

    try {
      if (parameters.error)
        throw new Error(
          friendlyAuthError(
            { code: parameters.error, message: parameters.error },
            "recovery",
          ),
        );

      if (parameters.code) {
        const { error } = await auth.exchangeCodeForSession(parameters.code);
        if (error) throw new Error(friendlyAuthError(error, "recovery"));
        return true;
      }

      if (parameters.accessToken && parameters.refreshToken) {
        const { error } = await auth.setSession({
          access_token: parameters.accessToken,
          refresh_token: parameters.refreshToken,
        });
        if (error) throw new Error(friendlyAuthError(error, "recovery"));
        return true;
      }

      throw new Error(
        "This password reset link is invalid or has expired. Request a new link.",
      );
    } finally {
      clearRecoveryUrl();
    }
  }

  function listenForPasswordRecovery({
    onRecovery,
    onError,
  }: {
    onRecovery: () => void;
    onError: (message: string) => void;
  }) {
    let active = true;

    async function handleUrl(url: string | null) {
      if (!url) return;
      try {
        const recovered = await establishRecoverySession(url);
        if (active && recovered) onRecovery();
      } catch (error) {
        if (active)
          onError(
            error instanceof Error
              ? error.message
              : friendlyAuthError(error, "recovery"),
          );
      }
    }

    linking.getInitialURL().then(handleUrl);
    const subscription = linking.addEventListener("url", ({ url }) =>
      handleUrl(url),
    );

    return () => {
      active = false;
      subscription.remove();
    };
  }

  return {
    establishRecoverySession,
    listenForPasswordRecovery,
    requestPasswordReset: (email: string) =>
      auth.resetPasswordForEmail(email.trim(), {
        redirectTo: linking.createURL("", {
          queryParams: { recovery: "password" },
        }),
      }),
    signIn: (email: string, password: string) =>
      auth.signInWithPassword({ email: email.trim(), password }),
    signOut: (options?: { scope?: 'global' | 'local' | 'others' }) =>
      auth.signOut(options),
    signUp: (email: string, password: string) =>
      auth.signUp({ email: email.trim(), password }),
    updatePassword: (password: string) => auth.updateUser({ password }),
  };
}
