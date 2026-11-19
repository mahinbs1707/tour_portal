import { useCallback, useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { SkipLink } from "../components/chrome/SkipLink.jsx";
import { TopNav } from "../components/chrome/TopNav.jsx";
import { StatusToast } from "../components/ui/StatusToast.jsx";
import { customerNavItems } from "../features/auth/navConfig.js";
import { getUnreadNotificationCount } from "../features/notifications/notificationsApi.js";
import { UNREAD_COUNT_INVALIDATE } from "../features/notifications/unreadEvents.js";

export function CustomerLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
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

  const refreshUnreadCount = useCallback(async () => {
    try {
      const data = await getUnreadNotificationCount();
      const count = Number(data?.count);
      setUnreadCount(Number.isFinite(count) && count > 0 ? count : 0);
    } catch {
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    refreshUnreadCount();
  }, [location.pathname, refreshUnreadCount]);

  useEffect(() => {
    const onInvalidate = () => {
      refreshUnreadCount();
    };
    window.addEventListener(UNREAD_COUNT_INVALIDATE, onInvalidate);
    return () => window.removeEventListener(UNREAD_COUNT_INVALIDATE, onInvalidate);
  }, [refreshUnreadCount]);

  const navItems = useMemo(
    () =>
      customerNavItems.map((item) =>
        item.to === "/app/customer/notifications"
          ? { ...item, badgeCount: unreadCount }
          : item,
      ),
    [unreadCount],
  );

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)] text-[var(--color-foreground)]">
      <SkipLink />
      <TopNav brandTo="/app/customer" items={navItems} />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        <Outlet />
      </main>
      <StatusToast message={toastMessage} onDismiss={dismissToast} />
    </div>
  );
}
