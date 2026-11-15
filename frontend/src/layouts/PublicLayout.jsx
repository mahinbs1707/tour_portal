import { Outlet } from "react-router-dom";
import { SkipLink } from "../components/chrome/SkipLink.jsx";
import { TopNav } from "../components/chrome/TopNav.jsx";
import { useAuth } from "../features/auth/AuthContext.jsx";
import { resolveTopNavItems } from "../features/auth/navConfig.js";

export function PublicLayout() {
  const { isAuthenticated, bootstrapping, role } = useAuth();
  const items = resolveTopNavItems({ bootstrapping, isAuthenticated, role });

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)] text-[var(--color-foreground)]">
      <SkipLink />
      <TopNav items={items} />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
