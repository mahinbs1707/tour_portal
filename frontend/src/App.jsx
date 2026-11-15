import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AdminHomePage } from "./features/admin/AdminHomePage.jsx";
import { CustomerHomePage } from "./features/customer/CustomerHomePage.jsx";
import { LandingPage } from "./features/public/LandingPage.jsx";
import { PlaceholderPage } from "./features/public/PlaceholderPage.jsx";
import { messages } from "./i18n/messages.js";
import { AdminLayout } from "./layouts/AdminLayout.jsx";
import { CustomerLayout } from "./layouts/CustomerLayout.jsx";
import { PublicLayout } from "./layouts/PublicLayout.jsx";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="explore" element={<PlaceholderPage title={messages.nav.explore} />} />
        <Route path="ai" element={<PlaceholderPage title={messages.nav.ai} />} />
        <Route path="sign-in" element={<PlaceholderPage title={messages.nav.signIn} />} />
        <Route path="sign-up" element={<PlaceholderPage title={messages.nav.signUp} />} />
        <Route path="sign-out" element={<PlaceholderPage title={messages.nav.signOut} />} />
      </Route>

      <Route path="app/customer" element={<CustomerLayout />}>
        <Route index element={<CustomerHomePage />} />
        <Route
          path="bookings"
          element={<PlaceholderPage title={messages.nav.myBookings} />}
        />
        <Route
          path="custom-tours"
          element={<PlaceholderPage title={messages.nav.customTours} />}
        />
        <Route
          path="notifications"
          element={<PlaceholderPage title={messages.nav.notifications} />}
        />
      </Route>

      <Route path="app/admin" element={<AdminLayout />}>
        <Route index element={<AdminHomePage />} />
        <Route
          path="packages"
          element={<PlaceholderPage title={messages.nav.packages} />}
        />
        <Route
          path="bookings"
          element={<PlaceholderPage title={messages.nav.bookings} />}
        />
        <Route
          path="custom-tours"
          element={<PlaceholderPage title={messages.nav.customToursAdmin} />}
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
