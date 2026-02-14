import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { ToastContainer } from './components/feedback/ToastContainer';
import { CommandPalette } from './components/feedback/CommandPalette';
import { DashboardLayout } from './components/layout/DashboardLayout';

// Public Pages
import { LandingPage } from './pages/public/LandingPage';
import { PricingPage } from './pages/public/PricingPage';
import { AboutPage } from './pages/public/AboutPage';
import { ContactPage } from './pages/public/ContactPage';
import { BlogListingPage } from './pages/public/BlogListingPage';
import { BlogPostPage } from './pages/public/BlogPostPage';
import { StatusPage } from './pages/public/StatusPage';

// Legal Pages
import { TermsOfServicePage } from './pages/public/legal/TermsOfServicePage';
import { PrivacyPolicyPage } from './pages/public/legal/PrivacyPolicyPage';
import { AcceptableUsePolicyPage } from './pages/public/legal/AcceptableUsePolicyPage';
import { DataProcessingAgreementPage } from './pages/public/legal/DataProcessingAgreementPage';
import { CookiePolicyPage } from './pages/public/legal/CookiePolicyPage';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage';
import { MfaSetupPage } from './pages/auth/MfaSetupPage';
import { MfaVerifyPage } from './pages/auth/MfaVerifyPage';

// Dashboard Pages
import DashboardOverviewPage from './pages/dashboard/DashboardOverviewPage';
import ApiKeysPage from './pages/dashboard/ApiKeysPage';
import JobsPage from './pages/dashboard/JobsPage';
import { JobDetailPage } from './pages/dashboard/JobDetailPage';
import UsagePage from './pages/dashboard/UsagePage';
import BillingPage from './pages/dashboard/BillingPage';

// Settings Pages
import SettingsPage from './pages/settings/SettingsPage';

// Support Pages
import SupportTicketsPage from './pages/support/SupportTicketsPage';
import { SupportTicketDetailPage } from './pages/support/SupportTicketDetailPage';

// Docs Pages
import { DocsLayout } from './components/docs/DocsLayout';
import { QuickstartPage } from './pages/docs/QuickstartPage';
import { ChangelogPage } from './pages/docs/ChangelogPage';
import { ScrapingApiPage } from './pages/docs/api/ScrapingApiPage';
import { ApiKeysPage as DocsApiKeysPage } from './pages/docs/api/ApiKeysPage';
import { UsageApiPage } from './pages/docs/api/UsageApiPage';
import { WebhooksApiPage } from './pages/docs/api/WebhooksApiPage';
import { JobsApiPage } from './pages/docs/api/JobsApiPage';
import { BatchApiPage } from './pages/docs/api/BatchApiPage';
import { ErrorsApiPage } from './pages/docs/api/ErrorsApiPage';
import { EngineSelectionPage } from './pages/docs/guides/EngineSelectionPage';
import { ErrorHandlingPage } from './pages/docs/guides/ErrorHandlingPage';
import { ProxyUsagePage } from './pages/docs/guides/ProxyUsagePage';
import { PaginationPage } from './pages/docs/guides/PaginationPage';
import { RateLimitsPage } from './pages/docs/guides/RateLimitsPage';
import { BestPracticesPage } from './pages/docs/guides/BestPracticesPage';
import { WebhooksGuidePage } from './pages/docs/guides/WebhooksGuidePage';
import { CaptchaSolvingPage } from './pages/docs/guides/CaptchaSolvingPage';
import { DataExtractionPage } from './pages/docs/guides/DataExtractionPage';
import { PythonSdkPage } from './pages/docs/sdks/PythonSdkPage';
import { NodeSdkPage } from './pages/docs/sdks/NodeSdkPage';

// Admin Pages
import { AdminLayout } from './components/layout/AdminLayout';
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminUserDetailPage } from './pages/admin/AdminUserDetailPage';
import { AdminAccountsPage } from './pages/admin/AdminAccountsPage';
import { AdminAccountDetailPage } from './pages/admin/AdminAccountDetailPage';
import { AdminModerationPage } from './pages/admin/AdminModerationPage';
import { AdminReportDetailPage } from './pages/admin/AdminReportDetailPage';
import { AdminFinancePage } from './pages/admin/AdminFinancePage';
import { AdminSubscriptionsPage } from './pages/admin/AdminSubscriptionsPage';
import { AdminInvoicesPage } from './pages/admin/AdminInvoicesPage';
import { AdminCreditsPage } from './pages/admin/AdminCreditsPage';
import { AdminOperationsPage } from './pages/admin/AdminOperationsPage';
import { AdminQueuesPage } from './pages/admin/AdminQueuesPage';
import { AdminJobInspectorPage } from './pages/admin/AdminJobInspectorPage';
import { AdminErrorsPage } from './pages/admin/AdminErrorsPage';
import { AdminAuditPage } from './pages/admin/AdminAuditPage';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <Router>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/blog" element={<BlogListingPage />} />
              <Route path="/blog/:slug" element={<BlogPostPage />} />
              <Route path="/status" element={<StatusPage />} />

              {/* Legal Routes */}
              <Route path="/legal/terms" element={<TermsOfServicePage />} />
              <Route path="/legal/privacy" element={<PrivacyPolicyPage />} />
              <Route path="/legal/acceptable-use" element={<AcceptableUsePolicyPage />} />
              <Route path="/legal/dpa" element={<DataProcessingAgreementPage />} />
              <Route path="/legal/cookies" element={<CookiePolicyPage />} />

              {/* Auth Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/signup" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
              <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
              <Route path="/mfa/setup" element={<MfaSetupPage />} />
              <Route path="/mfa/verify" element={<MfaVerifyPage />} />

              {/* Dashboard Routes */}
              <Route path="/dashboard" element={<DashboardLayout><DashboardOverviewPage /></DashboardLayout>} />
              <Route path="/dashboard/api-keys" element={<DashboardLayout><ApiKeysPage /></DashboardLayout>} />
              <Route path="/dashboard/keys" element={<DashboardLayout><ApiKeysPage /></DashboardLayout>} />
              <Route path="/dashboard/jobs" element={<DashboardLayout><JobsPage /></DashboardLayout>} />
              <Route path="/dashboard/jobs/:jobId" element={<DashboardLayout><JobDetailPage /></DashboardLayout>} />
              <Route path="/dashboard/usage" element={<DashboardLayout><UsagePage /></DashboardLayout>} />
              <Route path="/dashboard/billing/*" element={<DashboardLayout><BillingPage /></DashboardLayout>} />
              <Route path="/dashboard/settings" element={<DashboardLayout><SettingsPage /></DashboardLayout>} />
              <Route path="/dashboard/support" element={<DashboardLayout><SupportTicketsPage /></DashboardLayout>} />
              <Route path="/dashboard/support/:ticketId" element={<DashboardLayout><SupportTicketDetailPage /></DashboardLayout>} />

              {/* Docs Routes */}
              <Route path="/docs" element={<DocsLayout><QuickstartPage /></DocsLayout>} />
              <Route path="/docs/quickstart" element={<DocsLayout><QuickstartPage /></DocsLayout>} />
              <Route path="/docs/changelog" element={<DocsLayout><ChangelogPage /></DocsLayout>} />
              <Route path="/docs/api/scraping" element={<DocsLayout><ScrapingApiPage /></DocsLayout>} />
              <Route path="/docs/api/scrape" element={<DocsLayout><ScrapingApiPage /></DocsLayout>} />
              <Route path="/docs/api/api-keys" element={<DocsLayout><DocsApiKeysPage /></DocsLayout>} />
              <Route path="/docs/api/usage" element={<DocsLayout><UsageApiPage /></DocsLayout>} />
              <Route path="/docs/api/webhooks" element={<DocsLayout><WebhooksApiPage /></DocsLayout>} />
              <Route path="/docs/api/jobs" element={<DocsLayout><JobsApiPage /></DocsLayout>} />
              <Route path="/docs/api/batch" element={<DocsLayout><BatchApiPage /></DocsLayout>} />
              <Route path="/docs/api/errors" element={<DocsLayout><ErrorsApiPage /></DocsLayout>} />
              <Route path="/docs/guides/engine-selection" element={<DocsLayout><EngineSelectionPage /></DocsLayout>} />
              <Route path="/docs/guides/javascript-rendering" element={<DocsLayout><EngineSelectionPage /></DocsLayout>} />
              <Route path="/docs/guides/error-handling" element={<DocsLayout><ErrorHandlingPage /></DocsLayout>} />
              <Route path="/docs/guides/proxy-usage" element={<DocsLayout><ProxyUsagePage /></DocsLayout>} />
              <Route path="/docs/guides/proxy-selection" element={<DocsLayout><ProxyUsagePage /></DocsLayout>} />
              <Route path="/docs/guides/pagination" element={<DocsLayout><PaginationPage /></DocsLayout>} />
              <Route path="/docs/guides/rate-limits" element={<DocsLayout><RateLimitsPage /></DocsLayout>} />
              <Route path="/docs/guides/best-practices" element={<DocsLayout><BestPracticesPage /></DocsLayout>} />
              <Route path="/docs/guides/webhooks" element={<DocsLayout><WebhooksGuidePage /></DocsLayout>} />
              <Route path="/docs/guides/captcha-solving" element={<DocsLayout><CaptchaSolvingPage /></DocsLayout>} />
              <Route path="/docs/guides/data-extraction" element={<DocsLayout><DataExtractionPage /></DocsLayout>} />
              <Route path="/docs/sdks/python" element={<DocsLayout><PythonSdkPage /></DocsLayout>} />
              <Route path="/docs/sdks/node" element={<DocsLayout><NodeSdkPage /></DocsLayout>} />

              {/* Admin Routes */}
              <Route path="/admin" element={<AdminLayout><AdminOverviewPage /></AdminLayout>} />
              <Route path="/admin/users" element={<AdminLayout><AdminUsersPage /></AdminLayout>} />
              <Route path="/admin/users/:userId" element={<AdminLayout><AdminUserDetailPage /></AdminLayout>} />
              <Route path="/admin/accounts" element={<AdminLayout><AdminAccountsPage /></AdminLayout>} />
              <Route path="/admin/accounts/:accountId" element={<AdminLayout><AdminAccountDetailPage /></AdminLayout>} />
              <Route path="/admin/moderation" element={<AdminLayout><AdminModerationPage /></AdminLayout>} />
              <Route path="/admin/moderation/:reportId" element={<AdminLayout><AdminReportDetailPage /></AdminLayout>} />
              <Route path="/admin/finance" element={<AdminLayout><AdminFinancePage /></AdminLayout>} />
              <Route path="/admin/finance/subscriptions" element={<AdminLayout><AdminSubscriptionsPage /></AdminLayout>} />
              <Route path="/admin/finance/invoices" element={<AdminLayout><AdminInvoicesPage /></AdminLayout>} />
              <Route path="/admin/finance/credits" element={<AdminLayout><AdminCreditsPage /></AdminLayout>} />
              <Route path="/admin/operations" element={<AdminLayout><AdminOperationsPage /></AdminLayout>} />
              <Route path="/admin/operations/queues" element={<AdminLayout><AdminQueuesPage /></AdminLayout>} />
              <Route path="/admin/operations/jobs/:jobId" element={<AdminLayout><AdminJobInspectorPage /></AdminLayout>} />
              <Route path="/admin/operations/errors" element={<AdminLayout><AdminErrorsPage /></AdminLayout>} />
              <Route path="/admin/audit" element={<AdminLayout><AdminAuditPage /></AdminLayout>} />
            </Routes>
            <ToastContainer />
            <CommandPalette />
          </Router>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
