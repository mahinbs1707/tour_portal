import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ensureCsrf,
  login as apiLogin,
  logout as apiLogout,
  me as apiMe,
  resetSessionEndedNotification,
  setSessionEndedHandler,
} from "../../services/apiClient.js";

const AuthContext = createContext(null);

/** Testable seam for the draft-restore stub (UX-DR11). */
export const draftRestoreStub = {
  current: () => {},
};

/**
 * Stub for later non-sensitive draft restore after session expiry (UX-DR11).
 * Story 1.5 only exposes the hook; no persistence yet.
 */
export function useDraftRestore() {
  return useCallback(() => {
    draftRestoreStub.current();
  }, []);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [sessionExpiredOpen, setSessionExpiredOpen] = useState(false);
  const restoreDrafts = useDraftRestore();

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        await ensureCsrf();
        const identity = await apiMe();
        if (!cancelled) {
          // Prefer an identity already set by in-flight signIn/signUp.
          setUser((current) => current ?? identity);
        }
      } catch {
        // Unauthenticated Guest, or ignore late /me/ failure after signIn/signUp.
        // Do not clear a user that was already established.
      } finally {
        if (!cancelled) {
          setBootstrapping(false);
        }
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setSessionEndedHandler(() => {
      setUser(null);
      setSessionExpiredOpen(true);
      restoreDrafts();
    });
    return () => setSessionEndedHandler(null);
  }, [restoreDrafts]);

  const signIn = useCallback(async ({ email, password }) => {
    const identity = await apiLogin({ email, password });
    setUser(identity);
    setSessionExpiredOpen(false);
    resetSessionEndedNotification();
    return identity;
  }, []);

  const signOut = useCallback(async () => {
    // Clear local first so Guest chrome matches AC even if logout API fails.
    // Risk: server session may linger until cookie expiry if logout fails.
    setUser(null);
    setSessionExpiredOpen(false);
    resetSessionEndedNotification();
    try {
      await apiLogout();
    } catch {
      // Best-effort server invalidation; local Guest state already applied.
    }
  }, []);

  const dismissSessionExpired = useCallback(() => {
    setSessionExpiredOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      user,
      role: user?.role ?? null,
      isAuthenticated: Boolean(user),
      bootstrapping,
      sessionExpiredOpen,
      signIn,
      signOut,
      dismissSessionExpired,
      setUser,
    }),
    [
      user,
      bootstrapping,
      sessionExpiredOpen,
      signIn,
      signOut,
      dismissSessionExpired,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
