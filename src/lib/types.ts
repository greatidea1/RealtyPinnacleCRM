import { getHoursIST } from '@/lib/datetime';

export type UserRole = 'ADMIN' | 'AGENT';

export type PageView =
  | 'login' | 'forgot-password' | 'reset-password' | 'verify-email' | 'register'
  | 'dashboard' | 'properties' | 'property-detail' | 'clients' | 'client-detail'
  | 'deals' | 'deal-detail' | 'tasks' | 'notifications' | 'settings'
  | 'search-results';

export type PropertyType = 'Apartment' | 'Villa' | 'Penthouse' | 'Commercial' | 'Plot' | 'Studio';
export type PropertyStatus = 'Active' | 'Pending' | 'Sold';
export type ClientType = 'Buyer' | 'Seller' | 'Tenant' | 'Landlord' | 'Investor';
export type ClientPriority = 'Hot' | 'Warm' | 'Cold';
export type ClientStatus = 'New Lead' | 'Contacted' | 'Site Visit Scheduled' | 'Negotiation' | 'Closed Won' | 'Closed Lost' | 'Inactive';
export type DealStage = 'Lead' | 'Site Visit' | 'Negotiation' | 'Token Advance' | 'Booking' | 'Closed';
export type TaskPriority = 'High' | 'Medium' | 'Low';
export type LeadSource = 'Website' | 'Referral' | 'Social Media' | 'Walk-in' | 'Advertisement' | 'JustDial' | 'MagicBricks' | '99Acres' | 'Housing.com' | 'Other';
export type NotificationType = 'deal_stage' | 'task_due' | 'task_overdue' | 'new_lead' | 'system';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface Property {
  id: string;
  propertyId?: string;
  title: string;
  propertyType: PropertyType;
  bedrooms?: number;
  bathrooms?: number;
  carpetArea?: number;
  builtUpArea?: number;
  price: number;
  priceUnit: string;
  floorNumber?: number;
  totalFloors?: number;
  ageOfProperty?: string;
  facing?: string;
  locality: string;
  city: string;
  pincode?: string;
  fullAddress: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  reraNumber?: string;
  developerName?: string;
  projectName?: string;
  projectReraNumber?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  contactDesignation?: string;
  description?: string;
  furnishing?: string;
  youtubeUrl?: string;
  status: PropertyStatus;
  assignedToId: string;
  listedDate: string;
  createdAt: string;
  updatedAt: string;
  amenities?: PropertyAmenity[];
  photos?: PropertyPhoto[];
  assignedTo?: Pick<User, 'id' | 'name' | 'avatar'>;
  _count?: { deals: number; tasks: number };
}

export interface PropertyAmenity {
  id: string;
  propertyId: string;
  amenity: string;
}

export interface PropertyPhoto {
  id: string;
  propertyId: string;
  url: string;
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  avatar?: string;
  clientType: ClientType;
  priority: ClientPriority;
  budgetMin?: number;
  budgetMax?: number;
  preferredLocation?: string;
  preferredType?: string;
  preferredBeds?: number;
  preferredFurnish?: string;
  leadSource?: string;
  status: ClientStatus;
  notes?: string;
  reminderDate?: string;
  reminderNote?: string;
  reminderDone: boolean;
  assignedToId: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: Pick<User, 'id' | 'name' | 'avatar'>;
  _count?: { deals: number; tasks: number };
}

export interface Deal {
  id: string;
  propertyId: string;
  clientId: string;
  stage: DealStage;
  dealValue?: number;
  expectedCloseDate?: string;
  notes?: string;
  assignedToId: string;
  createdAt: string;
  updatedAt: string;
  property?: Pick<Property, 'id' | 'title' | 'locality' | 'city' | 'propertyType' | 'price' | 'priceUnit'>;
  client?: Pick<Client, 'id' | 'name' | 'phone' | 'avatar'>;
  assignedTo?: Pick<User, 'id' | 'name' | 'avatar'>;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority: TaskPriority;
  isCompleted: boolean;
  assignedToId: string;
  propertyId?: string;
  clientId?: string;
  dealId?: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: Pick<User, 'id' | 'name' | 'avatar'>;
  property?: Pick<Property, 'id' | 'title' | 'locality'>;
  client?: Pick<Client, 'id' | 'name'>;
  deal?: Pick<Deal, 'id' | 'stage'>;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  description?: string;
  isRead: boolean;
  linkTo?: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  userId: string;
  entityType: string;
  entityId: string;
  action: string;
  description: string;
  createdAt: string;
  user?: Pick<User, 'id' | 'name' | 'avatar'>;
}

export interface DashboardStats {
  activeListings: number;
  activeClients: number;
  openDeals: number;
  pipelineValue: number;
  tasksDueToday: number;
  overdueTasks: number;
}

export const ALL_AMENITIES = [
  'Gym', 'Swimming Pool', 'Parking', 'Security', 'Clubhouse', 'Garden',
  'Lift', 'Power Backup', 'CCTV', 'Intercom', 'Jogging Track', 'Children Play Area',
  'Concierge', 'Jacuzzi', 'Sauna', 'Indoor Games', 'Party Hall', 'Valet Parking',
];

export const DEAL_STAGES: DealStage[] = ['Lead', 'Site Visit', 'Negotiation', 'Token Advance', 'Booking', 'Closed'];
export const STAGE_COLORS: Record<DealStage, string> = {
  'Lead': 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  'Site Visit': 'bg-teal-500/15 text-teal-400 border-teal-500/30',
  'Negotiation': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'Token Advance': 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  'Booking': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'Closed': 'bg-rose-500/15 text-rose-400 border-rose-500/30',
};
export const STAGE_BG_COLORS: Record<DealStage, string> = {
  'Lead': '#0284c7',
  'Site Visit': '#0d9488',
  'Negotiation': '#d97706',
  'Token Advance': '#7c3aed',
  'Booking': '#059669',
  'Closed': '#e11d48',
};

export const PRIORITY_COLORS: Record<TaskPriority | ClientPriority, string> = {
  'High': 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  'Medium': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'Low': 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  'Hot': 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  'Warm': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'Cold': 'bg-sky-500/15 text-sky-400 border-sky-500/30',
};

export const STATUS_COLORS: Record<PropertyStatus, string> = {
  'Active': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'Pending': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'Sold': 'bg-rose-500/15 text-rose-400 border-rose-500/30',
};

export const CLIENT_STATUS_COLORS: Record<ClientStatus, string> = {
  'New Lead': 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  'Contacted': 'bg-teal-500/15 text-teal-400 border-teal-500/30',
  'Site Visit Scheduled': 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  'Negotiation': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'Closed Won': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'Closed Lost': 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  'Inactive': 'bg-gray-500/15 text-gray-400 border-gray-500/30',
};

export function formatPrice(value: number, unit: string = 'Lakhs'): string {
  if (unit === 'Crore') return `₹${value} Cr`;
  return `₹${value}L`;
}

export function formatPriceShort(value: number, unit: string = 'Lakhs'): string {
  if (unit === 'Crore') return `₹${value}Cr`;
  return `₹${value}L`;
}

export function getGreeting(): string {
  const h = getHoursIST();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function getAvatarColor(name: string): string {
  const colors = ['bg-cyan-600', 'bg-blue-600', 'bg-amber-600', 'bg-violet-600', 'bg-sky-600', 'bg-rose-600'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}