import * as Linking from "expo-linking";
import {
  clearBrowserRecoveryUrl,
  createAuthService,
  friendlyAuthError,
  getRecoveryDisplayState,
  type BrowserAdapter,
} from "./auth-core";
import { supabase } from "./supabase";

const service = createAuthService({
  auth: supabase.auth,
  linking: Linking,
  clearRecoveryUrl: () =>
    clearBrowserRecoveryUrl(
      typeof window === "undefined"
        ? undefined
        : (window as unknown as BrowserAdapter),
    ),
});

export { friendlyAuthError, getRecoveryDisplayState };
export const {
  listenForPasswordRecovery,
  requestPasswordReset,
  signIn,
  signOut,
  signUp,
  updatePassword,
} = service;

export const getCurrentSession = () => supabase.auth.getSession();
export const subscribeToAuthChanges = (
  callback: Parameters<typeof supabase.auth.onAuthStateChange>[0],
) => supabase.auth.onAuthStateChange(callback);
