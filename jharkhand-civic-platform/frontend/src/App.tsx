import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { offlineService } from './services/offline';

// Pages
import HomePage from './pages/HomePage';
import OnboardingPage from './pages/OnboardingPage';
import ReportIssuePage from './pages/ReportIssuePage';
import MyReportsPage from './pages/MyReportsPage';
import ReportDetailPage from './pages/ReportDetailPage';
import PublicMapPage from './pages/PublicMapPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminReportsPage from './pages/admin/AdminReportsPage';
import AdminAnalyticsPage from './pages/admin/AdminAnalyticsPage';
import AdminRulesPage from './pages/admin/AdminRulesPage';

// Components
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import OfflineIndicator from './components/OfflineIndicator';

function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize offline service
    offlineService.init().then(() => {
      setIsInitialized(true);
    });

    // Online/offline event listeners
    const handleOnline = () => {
      setIsOnline(true);
      // Trigger sync when coming back online
      offlineService.syncPendingReports().catch(console.error);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <OfflineIndicator isOnline={isOnline} />
      <Routes>
        {/* Public routes */}
        <Route path="/onboarding" element={<OnboardingPage />} />
        
        {/* Citizen routes */}
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="report" element={<ReportIssuePage />} />
          <Route path="my-reports" element={<MyReportsPage />} />
          <Route path="reports/:id" element={<ReportDetailPage />} />
          <Route path="map" element={<PublicMapPage />} />
        </Route>

        {/* Admin routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="reports" element={<AdminReportsPage />} />
          <Route path="analytics" element={<AdminAnalyticsPage />} />
          <Route path="rules" element={<AdminRulesPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
