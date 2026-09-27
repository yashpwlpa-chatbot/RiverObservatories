import { Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom';
import { Providers } from './components/providers';
import { Header } from './components/layout/header';
import { Footer } from './components/layout/footer';

import HomePage from './pages/home';
import AboutPage from './pages/about';
import ContactPage from './pages/contact';
import LoginPage from './pages/login';
import RiversPage from './pages/rivers';
import RiverDetailPage from './pages/river-detail';
import DataPage from './pages/data';
import GisPage from './pages/gis';
import AdminLayout from './layouts/admin-layout';
import ResearcherLayout from './layouts/researcher-layout';
import AdminDashboard from './pages/admin/dashboard';
import AdminImportPage from './pages/admin/import';
import AdminDatasetsPage from './pages/admin/datasets';
import AdminGeographyPage from './pages/admin/geography';
import AdminUsersPage from './pages/admin/users';
import AdminAuditPage from './pages/admin/audit';
import ResearcherDashboard from './pages/researcher/dashboard';
import ResearcherUploadPage from './pages/researcher/upload';
import ResearcherSubmissionsPage from './pages/researcher/submissions';
import NotFoundPage from './pages/not-found';

function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

function HydrologyRedirect() {
  const { riverId } = useParams<{ riverId: string }>();
  return <Navigate to={'/data?river=' + encodeURIComponent(riverId ?? '') + '&tab=graphs'} replace />;
}

export default function App() {
  return (
    <Providers>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/rivers" element={<RiversPage />} />
          <Route path="/rivers/:riverId" element={<RiverDetailPage />} />
          <Route path="/rivers/:riverId/hydrology" element={<HydrologyRedirect />} />
          <Route path="/data" element={<DataPage />} />
          <Route path="/gis" element={<GisPage />} />
          <Route path="/visualize" element={<Navigate to="/data?tab=interactive" replace />} />
          <Route path="/datasets" element={<Navigate to="/rivers" replace />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/login" element={<LoginPage />} />

          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="import" element={<AdminImportPage />} />
            <Route path="datasets" element={<AdminDatasetsPage />} />
            <Route path="rivers" element={<AdminGeographyPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="audit" element={<AdminAuditPage />} />
          </Route>

          <Route path="/researcher" element={<ResearcherLayout />}>
            <Route index element={<ResearcherDashboard />} />
            <Route path="upload" element={<ResearcherUploadPage />} />
            <Route path="submissions" element={<ResearcherSubmissionsPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Providers>
  );
}
