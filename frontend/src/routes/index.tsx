/**
 * Application Routing Definition
 * Sets up routing with lazy loading, layout wrappers, and authentication guards
 */
import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import AppShell from '../components/layout/AppShell';

// Lazy loaded page components
const LoginPage = lazy(() => import('../features/auth/pages/LoginPage'));
const DashboardPage = lazy(() => import('../features/dashboard/pages/DashboardPage'));
const UnauthorizedPage = lazy(() => import('../features/shared/pages/UnauthorizedPage'));
const NotFoundPage = lazy(() => import('../features/shared/pages/NotFoundPage'));

// Student pages (Phase 2)
const StudentListPage = lazy(() => import('../features/students/pages/StudentListPage'));
const StudentFormPage = lazy(() => import('../features/students/pages/StudentFormPage'));
const StudentImportPage = lazy(() => import('../features/students/pages/StudentImportPage'));
const ClassPromotionPage = lazy(() => import('../features/students/pages/ClassPromotionPage'));
const LevelClassPage = lazy(() => import('../features/students/pages/LevelClassPage'));
const DiscountCategoryPage = lazy(() => import('../features/students/pages/DiscountCategoryPage'));
const AcademicYearPage = lazy(() => import('../features/students/pages/AcademicYearPage'));

// Settings pages (Phase 2)
const UserManagementPage = lazy(() => import('../features/auth/pages/UserManagementPage'));
const MadrasahProfilePage = lazy(() => import('../features/settings/pages/MadrasahProfilePage'));
const UserProfilePage = lazy(() => import('../features/settings/pages/UserProfilePage'));
const ApiGatewaySettingsPage = lazy(() => import('../features/settings/pages/ApiGatewaySettingsPage'));
const RolePermissionsPage = lazy(() => import('../features/settings/pages/RolePermissionsPage'));
const DatabaseBackupPage = lazy(() => import('../features/settings/pages/DatabaseBackupPage'));

// Billing pages (Phase 3)
const BillingListPage = lazy(() => import('../features/billing/pages/BillingListPage'));
const BillingTypesPage = lazy(() => import('../features/billing/pages/BillingTypesPage'));

// POS Cashier pages (Phase 3)
const POSPage = lazy(() => import('../features/pos/pages/POSPage'));
const TransactionHistoryPage = lazy(() => import('../features/pos/pages/TransactionHistoryPage'));

// Savings & Expenses pages (Phase 4)
const SavingsListPage = lazy(() => import('../features/savings/pages/SavingsListPage'));
const SavingsDetailPage = lazy(() => import('../features/savings/pages/SavingsDetailPage'));
const ExpenseListPage = lazy(() => import('../features/expenses/pages/ExpenseListPage'));
const ExpenseFormPage = lazy(() => import('../features/expenses/pages/ExpenseFormPage'));
const ExpenseCategoryPage = lazy(() => import('../features/expenses/pages/ExpenseCategoryPage'));

// Notification, Audit & Reports pages (Phase 5)
const NotificationCenterPage = lazy(() => import('../features/notifications/pages/NotificationCenterPage'));
const AuditTrailPage = lazy(() => import('../features/audit/pages/AuditTrailPage'));
const ReportPage = lazy(() => import('../features/audit/pages/ReportPage'));



const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
    <div className="spinner spinner-lg"></div>
  </div>
);

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Unauthorized Route */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Authenticated Dashboard & Workspace Shell */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            {/* Redirect root to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* Phase 2: Master Data - Student Routes */}
            <Route path="/students" element={<StudentListPage />} />
            <Route path="/students/new" element={<StudentFormPage />} />
            <Route path="/students/edit/:id" element={<StudentFormPage />} />
            <Route path="/students/import" element={<StudentImportPage />} />
            <Route path="/students/promotion" element={<ClassPromotionPage />} />
            <Route path="/students/levels" element={<LevelClassPage />} />
            <Route path="/students/discounts" element={<DiscountCategoryPage />} />
            <Route path="/students/years" element={<AcademicYearPage />} />

            {/* Phase 3: Smart Billing & POS */}
            <Route path="/billing" element={<BillingListPage />} />
            <Route path="/billing/years" element={<AcademicYearPage />} />
            <Route path="/billing/types" element={<BillingTypesPage />} />
            <Route path="/pos" element={<POSPage />} />
            <Route path="/pos/history" element={<TransactionHistoryPage />} />

            {/* Phase 4: Savings & Expenses */}
            <Route path="/savings" element={<SavingsListPage />} />
            <Route path="/savings/:id" element={<SavingsDetailPage />} />
            <Route path="/expenses" element={<ExpenseListPage />} />
            <Route path="/expenses/new" element={<ExpenseFormPage />} />
            <Route path="/expenses/categories" element={<ExpenseCategoryPage />} />

            {/* Phase 5: Notification, Audit Trail, & Reports */}
            <Route path="/notifications" element={<NotificationCenterPage />} />
            <Route path="/reports/audit" element={<AuditTrailPage />} />
            <Route path="/reports/financial" element={<ReportPage />} />

            {/* Phase 2: Settings & Profile */}
            <Route path="/settings/users" element={
              <ProtectedRoute allowedRoles={['SUPERADMIN']}>
                <UserManagementPage />
              </ProtectedRoute>
            } />
            <Route path="/settings/backup" element={
              <ProtectedRoute allowedRoles={['SUPERADMIN']}>
                <DatabaseBackupPage />
              </ProtectedRoute>
            } />
            <Route
              path="/settings/permissions"
              element={
                <ProtectedRoute allowedRoles={['SUPERADMIN']}>
                  <RolePermissionsPage />
                </ProtectedRoute>
              }
            />
            <Route path="/settings/profile" element={<MadrasahProfilePage />} />
            <Route path="/settings/user-profile" element={<UserProfilePage />} />
            <Route path="/settings/gateway" element={
              <ProtectedRoute allowedRoles={['SUPERADMIN']}>
                <ApiGatewaySettingsPage />
              </ProtectedRoute>
            } />
          </Route>
        </Route>

        {/* 404 Route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
