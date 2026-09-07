'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Sidebar } from '@/components/crm/Sidebar';
import { TopBar } from '@/components/crm/TopBar';
import { AuthScreen } from '@/components/crm/AuthScreen';
import { DashboardPage } from '@/components/crm/DashboardPage';
import { PropertiesListPage, PropertyForm } from '@/components/crm/PropertiesPage';
import { PropertyDetail as PropertyDetailPage } from '@/components/crm/PropertyDetail';
import { ClientsPage } from '@/components/crm/ClientsPage';
import { ClientDetailPage } from '@/components/crm/ClientDetailPage';
import { MatchesPage } from '@/components/crm/MatchesPage';
import { ReportsPage } from '@/components/crm/ReportsPage';
import { DealsPage, DealDetail, DealForm } from '@/components/crm/DealsPage';
import { TasksPage, TaskForm } from '@/components/crm/TasksPage';
import { NotificationsPage } from '@/components/crm/NotificationsPage';
import { SettingsPage } from '@/components/crm/SettingsPage';
import { DeleteDialog } from '@/components/crm/DeleteDialog';
import { ClientForm } from '@/components/crm/ClientForm';

/** Authenticated CRM shell: sidebar, top bar, and page router. */
export default function Home() {
  const { currentPage, isAuthenticated, authChecked, setAuthChecked, login, logout, setResetToken, navigate } =
    useAppStore();
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resetToken = params.get('resetToken');
    if (resetToken) {
      setResetToken(resetToken);
      navigate('reset-password');
      window.history.replaceState({}, '', window.location.pathname);
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth');
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.user) {
            login(data.user);
            if (!resetToken) useAppStore.setState({ currentPage: 'dashboard' });
          }
        } else if (!cancelled) {
          logout();
        }
      } catch {
        if (!cancelled) logout();
      } finally {
        if (!cancelled) {
          setAuthChecked(true);
          setBooting(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [login, logout, navigate, setAuthChecked, setResetToken]);

  const user = useAppStore((state) => state.user);
  useEffect(() => {
    if (user) {
      localStorage.setItem('realty_pinnacle_user', JSON.stringify(user));
      localStorage.removeItem('propcrm_user');
    } else {
      localStorage.removeItem('realty_pinnacle_user');
      localStorage.removeItem('propcrm_user');
    }
  }, [user]);

  if (booting || !authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (
    !isAuthenticated ||
    currentPage === 'reset-password' ||
    currentPage === 'forgot-password' ||
    currentPage === 'login' ||
    currentPage === 'register'
  ) {
    return <AuthScreen />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'properties':
        return <PropertiesListPage />;
      case 'property-detail':
        return <PropertyDetailPage />;
      case 'clients':
        return <ClientsPage />;
      case 'client-detail':
        return <ClientDetailPage />;
      case 'matches':
        return <MatchesPage />;
      case 'deals':
        return <DealsPage />;
      case 'reports':
        return <ReportsPage />;
      case 'deal-detail':
        return <DealDetail />;
      case 'tasks':
        return <TasksPage />;
      case 'notifications':
        return <NotificationsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto custom-scrollbar">{renderPage()}</main>
      </div>
      <PropertyForm />
      <ClientForm />
      <DealForm />
      <TaskForm />
      <DeleteDialog />
    </div>
  );
}
// End Home
