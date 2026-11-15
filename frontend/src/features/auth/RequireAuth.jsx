import { Navigate, useLocation } from "react-router-dom";
import { AuthBootstrapPlaceholder } from "./AuthBootstrapPlaceholder.jsx";
import { useAuth } from "./AuthContext.jsx";

/**
 * FE UX guard: Guests hitting gated Customer/Admin routes → Sign in.
 * Optional `?next=` return path (consumed by SignInPage).
 * Waits for AuthProvider bootstrap before deciding.
 */
export function RequireAuth({ children }) {
  const { isAuthenticated, bootstrapping } = useAuth();
  const location = useLocation();

  if (bootstrapping) {
    return <AuthBootstrapPlaceholder />;
  }

  if (!isAuthenticated) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    const search = new URLSearchParams({ next: returnTo }).toString();
    return <Navigate to={`/sign-in?${search}`} replace />;
  }

  return children;
}
