import { create } from 'zustand';
import type { User, PageView, Property, Client, Deal, Task, Notification, Activity, DashboardStats } from './types';

interface AppState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;

  // Navigation
  currentPage: PageView;
  selectedId: string | null;
  previousPage: PageView;
  navigate: (page: PageView, id?: string) => void;
  goBack: () => void;

  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;

  // Modals
  showPropertyForm: boolean;
  editingProperty: Property | null;
  openPropertyForm: (property?: Property) => void;
  closePropertyForm: () => void;

  showClientForm: boolean;
  editingClient: Client | null;
  openClientForm: (client?: Client) => void;
  closeClientForm: () => void;

  showDealForm: boolean;
  editingDeal: Deal | null;
  openDealForm: (deal?: Deal) => void;
  closeDealForm: () => void;

  showTaskForm: boolean;
  editingTask: Task | null;
  openTaskForm: (task?: Task) => void;
  closeTaskForm: () => void;

  showDeleteDialog: boolean;
  deleteTarget: { type: string; id: string; name: string } | null;
  openDeleteDialog: (type: string, id: string, name: string) => void;
  closeDeleteDialog: () => void;

  // Search
  searchQuery: string;
  searchOpen: boolean;
  searchTab: 'all' | 'properties' | 'clients';
  setSearchQuery: (q: string) => void;
  setSearchOpen: (open: boolean) => void;
  setSearchTab: (tab: 'all' | 'properties' | 'clients') => void;

  // Notification panel
  notifPanelOpen: boolean;
  setNotifPanelOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Auth
  user: null,
  isAuthenticated: false,
  login: (user) => set({ user, isAuthenticated: true }),
  logout: () => set({ user: null, isAuthenticated: false, currentPage: 'login', selectedId: null }),

  // Navigation
  currentPage: 'login',
  selectedId: null,
  previousPage: 'dashboard',
  navigate: (page, id) => {
    const { currentPage } = get();
    set({ previousPage: currentPage, currentPage: page, selectedId: id || null, mobileNavOpen: false });
  },
  goBack: () => {
    const { previousPage } = get();
    set({ currentPage: previousPage, selectedId: null });
  },

  // Sidebar
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  mobileNavOpen: false,
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),

  // Property form
  showPropertyForm: false,
  editingProperty: null,
  openPropertyForm: (property) => set({ showPropertyForm: true, editingProperty: property || null }),
  closePropertyForm: () => set({ showPropertyForm: false, editingProperty: null }),

  // Client form
  showClientForm: false,
  editingClient: null,
  openClientForm: (client) => set({ showClientForm: true, editingClient: client || null }),
  closeClientForm: () => set({ showClientForm: false, editingClient: null }),

  // Deal form
  showDealForm: false,
  editingDeal: null,
  openDealForm: (deal) => set({ showDealForm: true, editingDeal: deal || null }),
  closeDealForm: () => set({ showDealForm: false, editingDeal: null }),

  // Task form
  showTaskForm: false,
  editingTask: null,
  openTaskForm: (task) => set({ showTaskForm: true, editingTask: task || null }),
  closeTaskForm: () => set({ showTaskForm: false, editingTask: null }),

  // Delete dialog
  showDeleteDialog: false,
  deleteTarget: null,
  openDeleteDialog: (type, id, name) => set({ showDeleteDialog: true, deleteTarget: { type, id, name } }),
  closeDeleteDialog: () => set({ showDeleteDialog: false, deleteTarget: null }),

  // Search
  searchQuery: '',
  searchOpen: false,
  searchTab: 'all',
  setSearchQuery: (q) => set({ searchQuery: q }),
  setSearchOpen: (open) => set({ searchOpen: open }),
  setSearchTab: (tab) => set({ searchTab: tab }),

  // Notification panel
  notifPanelOpen: false,
  setNotifPanelOpen: (open) => set({ notifPanelOpen: open }),
}));