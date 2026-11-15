import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { SkipLink } from "../components/chrome/SkipLink.jsx";
import { TopNav } from "../components/chrome/TopNav.jsx";
import { StatusToast } from "../components/ui/StatusToast.jsx";
import { customerNavItems } from "../features/auth/navConfig.js";

export function CustomerLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [toastMessage, setToastMessage] = useState(
    () => location.state?.statusToast ?? null,
  );

  useEffect(() => {
    setToastMessage(location.state?.statusToast ?? null);
  }, [location.state]);

  const dismissToast = useCallback(() => {
    setToastMessage(null);
    if (location.state?.statusToast) {
      navigate(location.pathname + location.search + location.hash, {
        replace: true,
        state: {},
      });
    }
  }, [location.hash, location.pathname, location.search, location.state, navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)] text-[var(--color-foreground)]">
      <SkipLink />
      <TopNav brandTo="/app/customer" items={customerNavItems} />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        <Outlet />
      </main>
      <StatusToast message={toastMessage} onDismiss={dismissToast} />
    </div>
  );
}
