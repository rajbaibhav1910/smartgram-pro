import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './hooks/use-theme'
import { AuthProvider } from './hooks/use-auth'
import { ToastProvider } from './components/ui/toast'
import ErrorBoundary from './components/ui/ErrorBoundary'
import ProtectedRoute from './components/ui/ProtectedRoute'
import AdminRoute from './components/ui/AdminRoute'
import SuperAdminRoute from './components/ui/SuperAdminRoute'
import PublicLayout from './layouts/PublicLayout'
import AppLayout from './layouts/AppLayout'
import { RouteLoading } from './components/ui/RouteLoading'

// Pages are code-split so the initial bundle stays small
const LandingPage = lazy(() => import('./pages/LandingPage'))
const AuthLayout = lazy(() => import('./layouts/AuthLayout'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ComplaintsPage = lazy(() => import('./pages/ComplaintsPage'))
const ComplaintSubmitPage = lazy(() => import('./pages/ComplaintSubmitPage'))
const ComplaintDetailPage = lazy(() => import('./pages/ComplaintDetailPage'))
const NoticesPage = lazy(() => import('./pages/NoticesPage'))
const NoticeDetailPage = lazy(() => import('./pages/NoticeDetailPage'))
const SchemesPage = lazy(() => import('./pages/SchemesPage'))
const SchemeDetailPage = lazy(() => import('./pages/SchemeDetailPage'))
const MapPage = lazy(() => import('./pages/MapPage'))
const SuperAdminPage = lazy(() => import('./pages/SuperAdminPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const ForbiddenPage = lazy(() => import('./pages/ForbiddenPage'))

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <ErrorBoundary>
            <BrowserRouter>
              <Suspense fallback={<RouteLoading />}>
                <Routes>
                  {/* Auth pages: standalone split-screen layout */}
                  <Route element={<AuthLayout />}>
                    <Route path="login" element={<LoginPage />} />
                    <Route path="register" element={<RegisterPage />} />
                  </Route>

                  {/* Public routes */}
                  <Route path="/" element={<PublicLayout />}>
                    <Route index element={<LandingPage />} />
                    <Route path="notices" element={<NoticesPage />} />
                    <Route path="notices/:id" element={<NoticeDetailPage />} />
                    <Route path="schemes" element={<SchemesPage />} />
                    <Route path="schemes/:id" element={<SchemeDetailPage />} />
                    <Route path="map" element={<MapPage />} />
                    {/* Unknown URLs fall through to the public 404 */}
                    <Route path="*" element={<NotFoundPage />} />
                  </Route>

                  {/* Protected citizen routes */}
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <AppLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route path="dashboard" element={<DashboardPage />} />
                    <Route path="complaints" element={<ComplaintsPage />} />
                    <Route path="complaints/new" element={<ComplaintSubmitPage />} />
                    <Route path="complaints/:id" element={<ComplaintDetailPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                    {/* Shown when a citizen opens an admin-only area */}
                    <Route path="forbidden" element={<ForbiddenPage />} />
                    <Route path="map" element={<MapPage />} />
                  </Route>

                  {/* Protected admin routes */}
                  <Route path="/" element={<AdminRoute />}>
                    <Route path="admin" element={<AdminDashboardPage />} />
                    <Route path="complaints" element={<ComplaintsPage />} />
                    <Route path="complaints/:id" element={<ComplaintDetailPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path="map" element={<MapPage />} />
                  </Route>

                  {/* Platform administration (super admin only) */}
                  <Route
                    path="/super-admin"
                    element={
                      <SuperAdminRoute>
                        <AppLayout />
                      </SuperAdminRoute>
                    }
                  >
                    <Route index element={<SuperAdminPage />} />
                  </Route>
                </Routes>
              </Suspense>
            </BrowserRouter>
          </ErrorBoundary>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
