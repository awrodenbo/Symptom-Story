import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clearBrowserRecoveryUrl,
  createAuthService,
  friendlyAuthError,
  getRecoveryDisplayState,
  type BrowserAdapter,
} from "../src/auth-core.ts";

function createHarness(initialUrl: string | null = null) {
  const calls = {
    exchangeCode: [] as string[],
    redirect: [] as string[],
    sessions: [] as { access_token: string; refresh_token: string }[],
    updates: [] as string[],
  };
  let currentUrl = initialUrl;
  let urlListener: ((event: { url: string }) => void) | undefined;
  let recoveryCount = 0;
  let recoveryError = "";

  const auth = {
    exchangeCodeForSession: async (code: string) => {
      calls.exchangeCode.push(code);
      return { error: null };
    },
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    resetPasswordForEmail: async (
      _email: string,
      options: { redirectTo: string },
    ) => {
      calls.redirect.push(options.redirectTo);
      return { error: null };
    },
    setSession: async (session: {
      access_token: string;
      refresh_token: string;
    }) => {
      calls.sessions.push(session);
      return { error: null };
    },
    signInWithPassword: async () => ({ error: null }),
    signOut: async () => ({ error: null }),
    signUp: async () => ({ error: null }),
    updateUser: async ({ password }: { password: string }) => {
      calls.updates.push(password);
      return { error: null };
    },
  };
  const linking = {
    addEventListener: (
      _event: "url",
      callback: (event: { url: string }) => void,
    ) => {
      urlListener = callback;
      return { remove() {} };
    },
    createURL: () => "symptomstory://?recovery=password",
    getInitialURL: async () => currentUrl,
  };
  const service = createAuthService({
    auth,
    linking,
    clearRecoveryUrl: () => {
      currentUrl = "https://example.com/";
    },
  });

  return {
    calls,
    getCurrentUrl: () => currentUrl,
    getRecoveryCount: () => recoveryCount,
    getRecoveryError: () => recoveryError,
    listen: () =>
      service.listenForPasswordRecovery({
        onError: (message) => {
          recoveryError = message;
        },
        onRecovery: () => {
          recoveryCount += 1;
        },
      }),
    service,
    sendUrl: (url: string) => urlListener?.({ url }),
  };
}

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

test("reset request uses the generated recovery redirect", async () => {
  const { calls, service } = createHarness();
  await service.requestPasswordReset(" person@example.com ");
  assert.deepEqual(calls.redirect, ["symptomstory://?recovery=password"]);
});

test("implicit recovery credentials establish a session", async () => {
  const { calls, service } = createHarness();
  assert.equal(
    await service.establishRecoverySession(
      "symptomstory://?recovery=password#access_token=access&refresh_token=refresh&type=recovery",
    ),
    true,
  );
  assert.deepEqual(calls.sessions, [
    { access_token: "access", refresh_token: "refresh" },
  ]);
});

test("PKCE recovery codes are exchanged for a session", async () => {
  const { calls, service } = createHarness();
  await service.establishRecoverySession(
    "https://example.com/?recovery=password&code=one-time-code",
  );
  assert.deepEqual(calls.exchangeCode, ["one-time-code"]);
});

test("browser recovery credentials are removed with replaceState", () => {
  let replacement = "";
  const browser: BrowserAdapter = {
    history: {
      replaceState: (_state, _unused, url) => {
        replacement = String(url);
      },
      state: { navigation: "state" },
    },
    location: {
      href: "https://example.com/?recovery=password&code=secret&keep=yes#access_token=access&refresh_token=refresh",
    },
  };
  clearBrowserRecoveryUrl(browser);
  assert.equal(replacement, "/?keep=yes");
  assert.doesNotMatch(replacement, /secret|access|refresh|recovery/);
});

test("expired links return a friendly error", async () => {
  const { service } = createHarness();
  await assert.rejects(
    service.establishRecoverySession(
      "https://example.com/?recovery=password#error=access_denied&error_description=Token%20expired",
    ),
    /invalid or has expired/i,
  );
  assert.equal(
    friendlyAuthError({ status: 429, message: "rate limit" }, "request"),
    "Too many attempts. Please wait a few minutes and try again.",
  );
});

test("expired recovery remains visible when a session is persisted", async () => {
  const harness = createHarness(
    "https://example.com/?recovery=password#error=access_denied&error_description=Token%20expired",
  );
  harness.listen();
  await flushPromises();

  assert.match(harness.getRecoveryError(), /invalid or has expired/i);
  assert.equal(
    getRecoveryDisplayState({
      hasSession: true,
      recovering: false,
      recoveryError: harness.getRecoveryError(),
    }),
    "error-with-session",
  );
});

test("password updates send the new password to Supabase", async () => {
  const { calls, service } = createHarness();
  await service.updatePassword("a-new-strong-password");
  assert.deepEqual(calls.updates, ["a-new-strong-password"]);
});

test("refresh after recovery does not reopen recovery mode", async () => {
  const recoveryUrl =
    "https://example.com/?recovery=password#access_token=access&refresh_token=refresh&type=recovery";
  const harness = createHarness(recoveryUrl);
  harness.listen();
  await flushPromises();
  assert.equal(harness.getRecoveryCount(), 1);
  assert.equal(harness.getCurrentUrl(), "https://example.com/");

  const refreshed = createHarness(harness.getCurrentUrl());
  refreshed.listen();
  await flushPromises();
  assert.equal(refreshed.getRecoveryCount(), 0);
  assert.equal(refreshed.getRecoveryError(), "");
});
