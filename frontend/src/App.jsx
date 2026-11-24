import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AdminHomePage } from "./features/admin/AdminHomePage.jsx";
import { AuthProvider } from "./features/auth/AuthContext.jsx";
import { RequireAuth } from "./features/auth/RequireAuth.jsx";
import { RequireRole } from "./features/auth/RequireRole.jsx";
import { SessionExpiredModal } from "./features/auth/SessionExpiredModal.jsx";
import { ForgotPasswordPage } from "./features/auth/ForgotPasswordPage.jsx";
import { ResetPasswordPage } from "./features/auth/ResetPasswordPage.jsx";
import { SignInPage } from "./features/auth/SignInPage.jsx";
import { SignOutPage } from "./features/auth/SignOutPage.jsx";
import { SignUpPage } from "./features/auth/SignUpPage.jsx";
import { CustomerHomePage } from "./features/customer/CustomerHomePage.jsx";
import { AdminBookingDetailPage } from "./features/bookings/AdminBookingDetailPage.jsx";
import { AdminBookingsPage } from "./features/bookings/AdminBookingsPage.jsx";
import { BookingConfirmationPage } from "./features/bookings/BookingConfirmationPage.jsx";
import { BookingDetailPage } from "./features/bookings/BookingDetailPage.jsx";
import { MockCheckoutPage } from "./features/bookings/MockCheckoutPage.jsx";
import { BookingFormPage } from "./features/bookings/BookingFormPage.jsx";
import { MyBookingsPage } from "./features/bookings/MyBookingsPage.jsx";
import { AdminPackageFormPage } from "./features/packages/AdminPackageFormPage.jsx";
import { AdminPackagesPage } from "./features/packages/AdminPackagesPage.jsx";
import { ExplorePage } from "./features/packages/ExplorePage.jsx";
import { PackageDetailPage } from "./features/packages/PackageDetailPage.jsx";
import { LandingPage } from "./features/public/LandingPage.jsx";
import { PlaceholderPage } from "./features/public/PlaceholderPage.jsx";
import { CustomTourConfirmationPage } from "./features/customTours/CustomTourConfirmationPage.jsx";
import { CustomTourDetailPage } from "./features/customTours/CustomTourDetailPage.jsx";
import { CustomTourFormPage } from "./features/customTours/CustomTourFormPage.jsx";
import { CustomTourMockCheckoutPage } from "./features/customTours/CustomTourMockCheckoutPage.jsx";
import { CustomTourReapplyPage } from "./features/customTours/CustomTourReapplyPage.jsx";
import { AdminCustomTourDetailPage } from "./features/customTours/AdminCustomTourDetailPage.jsx";
import { AdminCustomToursPage } from "./features/customTours/AdminCustomToursPage.jsx";
import { MyCustomToursPage } from "./features/customTours/MyCustomToursPage.jsx";
import { NotificationsPage } from "./features/notifications/NotificationsPage.jsx";
import { AiRecommendationsPage } from "./features/recommendations/AiRecommendationsPage.jsx";
import { messages } from "./i18n/messages.js";
import { AdminLayout } from "./layouts/AdminLayout.jsx";
import { CustomerLayout } from "./layouts/CustomerLayout.jsx";
import { PublicLayout } from "./layouts/PublicLayout.jsx";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="explore" element={<ExplorePage />} />
        <Route path="explore/:id" element={<PackageDetailPage />} />
        <Route path="ai" element={<AiRecommendationsPage />} />
        <Route path="sign-in" element={<SignInPage />} />
        <Route path="sign-up" element={<SignUpPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="sign-out" element={<SignOutPage />} />
      </Route>

      <Route
        path="app/bookings"
        element={
          <RequireAuth>
            <RequireRole role="CUSTOMER">
              <CustomerLayout />
            </RequireRole>
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="new" replace />} />
        <Route path="new" element={<BookingFormPage />} />
        <Route path="confirmation" element={<BookingConfirmationPage />} />
      </Route>

      <Route
        path="app/customer"
        element={
          <RequireAuth>
            <RequireRole role="CUSTOMER">
              <CustomerLayout />
            </RequireRole>
          </RequireAuth>
        }
      >
        <Route index element={<CustomerHomePage />} />
        <Route path="bookings" element={<MyBookingsPage />} />
        <Route path="bookings/:id" element={<BookingDetailPage />} />
        <Route path="bookings/:id/pay" element={<MockCheckoutPage />} />
        <Route path="custom-tours" element={<MyCustomToursPage />} />
        <Route path="custom-tours/new" element={<CustomTourFormPage />} />
        <Route
          path="custom-tours/confirmation"
          element={<CustomTourConfirmationPage />}
        />
        <Route
          path="custom-tours/:id/reapply"
          element={<CustomTourReapplyPage />}
        />
        <Route
          path="custom-tours/:id/pay"
          element={<CustomTourMockCheckoutPage />}
        />
        <Route path="custom-tours/:id" element={<CustomTourDetailPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>

      <Route
        path="app/admin"
        element={
          <RequireAuth>
            <RequireRole role="ADMIN">
              <AdminLayout />
            </RequireRole>
          </RequireAuth>
        }
      >
        <Route index element={<AdminHomePage />} />
        <Route path="packages" element={<AdminPackagesPage />} />
        <Route path="packages/new" element={<AdminPackageFormPage />} />
        <Route
          path="packages/:packageId"
          element={<AdminPackageFormPage />}
        />
        <Route path="bookings" element={<AdminBookingsPage />} />
        <Route path="bookings/:id" element={<AdminBookingDetailPage />} />
        <Route path="custom-tours" element={<AdminCustomToursPage />} />
        <Route
          path="custom-tours/:id"
          element={<AdminCustomTourDetailPage />}
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <SessionExpiredModal />
      </AuthProvider>
    </BrowserRouter>
  );
}
