'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Sidebar } from '@/components/crm/Sidebar';
import { TopBar } from '@/components/crm/TopBar';
import { AuthScreen } from '@/components/crm/AuthScreen';
import { DashboardPage } from '@/components/crm/DashboardPage';
import { PropertiesListPage, PropertyForm } from '@/components/crm/PropertiesPage';
import { PropertyDetail as PropertyDetailPage } from '@/components/crm/PropertyDetail';
import { ClientsPage } from '@/components/crm/ClientsPage';
import { ClientDetailPage } from '@/components/crm/ClientDetailPage';
import { DealsPage, DealDetail, DealForm } from '@/components/crm/DealsPage';
import { TasksPage, TaskForm } from '@/components/crm/TasksPage';
import { NotificationsPage } from '@/components/crm/NotificationsPage';
import { SettingsPage } from '@/components/crm/SettingsPage';
import { DeleteDialog } from '@/components/crm/DeleteDialog';
import { ClientForm } from '@/components/crm/ClientForm';

export default function Home() {
  const { currentPage, isAuthenticated } = useAppStore();

  useEffect(() => {
    const saved =
      localStorage.getItem('realty_pinnacle_user') ||
      localStorage.getItem('propcrm_user');
    if (saved) {
      try { useAppStore.getState().login(JSON.parse(saved)); } catch {}
    }
  }, []);

  const user = useAppStore(state => state.user);
  useEffect(() => {
    if (user) {
      localStorage.setItem('realty_pinnacle_user', JSON.stringify(user));
      localStorage.removeItem('propcrm_user');
    } else {
      localStorage.removeItem('realty_pinnacle_user');
      localStorage.removeItem('propcrm_user');
    }
  }, [user]);

  if (!isAuthenticated) return <AuthScreen />;

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <DashboardPage />;
      case 'properties': return <PropertiesListPage />;
      case 'property-detail': return <PropertyDetailPage />;
      case 'clients': return <ClientsPage />;
      case 'client-detail': return <ClientDetailPage />;
      case 'deals': return <DealsPage />;
      case 'deal-detail': return <DealDetail />;
      case 'tasks': return <TasksPage />;
      case 'notifications': return <NotificationsPage />;
      case 'settings': return <SettingsPage />;
      default: return <DashboardPage />;
    }
  };

  return (
    <div className="flex h-screen bg-[#0f1117] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          {renderPage()}
        </main>
      </div>
      <PropertyForm />
      <ClientForm />
      <DealForm />
      <TaskForm />
      <DeleteDialog />
    </div>
  );
}