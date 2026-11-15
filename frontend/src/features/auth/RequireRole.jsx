import { Navigate } from "react-router-dom";
import { messages } from "../../i18n/messages.js";
import { AuthBootstrapPlaceholder } from "./AuthBootstrapPlaceholder.jsx";
import { useAuth } from "./AuthContext.jsx";

export const PERMISSION_DENIED_TOAST_STATE = {
  statusToast: messages.auth.permissionDenied,
};

/**
 * FE UX guard keyed on `user.role` only (CUSTOMER | ADMIN) — never is_staff.
 *
 * - Customer opening Admin → Customer home + status toast
 * - Admin opening Customer routes → Admin home (sidebar-first)
 * - Authenticated null/unknown role → `/` (never Customer↔Admin ping-pong)
 * Must sit inside RequireAuth so Guests never reach this branch.
 */
export function RequireRole({ role: requiredRole, children }) {
  const { role, bootstrapping } = useAuth();

  if (bootstrapping) {
    return <AuthBootstrapPlaceholder />;
  }

  if (role === requiredRole) {
    return children;
  }

  if (role !== "CUSTOMER" && role !== "ADMIN") {
    return <Navigate to="/" replace />;
  }

  if (requiredRole === "ADMIN" && role === "CUSTOMER") {
    return (
      <Navigate
        to="/app/customer"
        replace
        state={PERMISSION_DENIED_TOAST_STATE}
      />
    );
  }

  if (requiredRole === "CUSTOMER" && role === "ADMIN") {
    return <Navigate to="/app/admin" replace />;
  }

  return <Navigate to="/" replace />;
}
