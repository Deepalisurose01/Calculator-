// Type definitions for Jharkhand Civic Platform

export interface User {
  id: string;
  phone?: string;
  email?: string;
  name?: string;
  role: 'citizen' | 'admin' | 'department_staff' | 'super_admin';
  isAnonymous: boolean;
  deviceId?: string;
  fcmToken?: string;
}

export interface Category {
  id: string;
  name: string;
  nameHi: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  parentId?: string;
  defaultPriority: Priority;
  defaultSlaHours: number;
  isActive: boolean;
}

export interface Ward {
  id: string;
  wardNumber: string;
  wardName: string;
  wardNameHi: string;
  district: string;
  boundary?: GeoJSON.Polygon;
  population?: number;
  areaSqKm?: number;
}

export interface Department {
  id: string;
  name: string;
  nameHi: string;
  code: string;
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
  isActive: boolean;
}

export type ReportStatus = 
  | 'submitted' 
  | 'acknowledged' 
  | 'assigned' 
  | 'in_progress' 
  | 'resolved' 
  | 'closed' 
  | 'rejected';

export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  landmark?: string;
}

export interface ReportMedia {
  id: string;
  reportId: string;
  mediaType: 'photo' | 'video' | 'voice';
  originalUrl: string;
  thumbnailSmallUrl?: string;
  thumbnailMediumUrl?: string;
  optimizedUrl?: string;
  fileSize?: number;
  mimeType?: string;
  width?: number;
  height?: number;
  exifData?: Record<string, any>;
  captureTimestamp?: string;
  isProcessed: boolean;
  isFaceBlurred: boolean;
  displayOrder: number;
}

export interface Report {
  id: string;
  reportNumber: string;
  userId?: string;
  categoryId: string;
  category?: Category;
  wardId?: string;
  ward?: Ward;
  location: Location;
  title: string;
  description?: string;
  voiceNoteUrl?: string;
  voiceDurationSeconds?: number;
  status: ReportStatus;
  priority: Priority;
  assignedDepartmentId?: string;
  assignedDepartment?: Department;
  assignedToUserId?: string;
  assignedAt?: string;
  slaHours?: number;
  dueDate?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  isAnonymous: boolean;
  isPublic: boolean;
  isVerified: boolean;
  isDuplicate: boolean;
  duplicateOfReportId?: string;
  media?: ReportMedia[];
  upvotes: number;
  views: number;
  createdAt: string;
  updatedAt: string;
}

export interface TimelineEvent {
  id: string;
  reportId: string;
  userId?: string;
  action: string;
  oldValue?: string;
  newValue?: string;
  comment?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  reportId?: string;
  notificationType: string;
  channel: 'in_app' | 'push' | 'sms' | 'email';
  title: string;
  titleHi?: string;
  body: string;
  bodyHi?: string;
  status: 'pending' | 'sent' | 'failed' | 'read';
  sentAt?: string;
  readAt?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface RoutingRule {
  id: string;
  name: string;
  description?: string;
  priority: number;
  isActive: boolean;
  conditions: RuleConditions;
  targetDepartmentId?: string;
  setPriority?: Priority;
  setSlaHours?: number;
  autoAssignToUserId?: string;
}

export interface RuleConditions {
  categoryId?: string[];
  wardId?: string[];
  timeOfDay?: { start: string; end: string };
  dayOfWeek?: number[];
  keywords?: string[];
  priorityMin?: Priority;
}

export interface Assignment {
  id: string;
  reportId: string;
  departmentId: string;
  assignedToUserId?: string;
  assignedByUserId: string;
  notes?: string;
  dueDate?: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'rejected';
  acceptedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface Feedback {
  id: string;
  reportId: string;
  userId: string;
  rating: number;
  feedbackText?: string;
  resolutionSatisfaction?: number;
  responseTimeSatisfaction?: number;
  createdAt: string;
}

export interface AnalyticsMetrics {
  totalReports: number;
  reportsSubmitted: number;
  reportsResolved: number;
  reportsClosed: number;
  avgResolutionHours: number;
  medianResolutionHours: number;
  slaBreaches: number;
  slaComplianceRate: number;
}

export interface DashboardStats {
  today: AnalyticsMetrics;
  thisWeek: AnalyticsMetrics;
  thisMonth: AnalyticsMetrics;
  byCategory: Record<string, AnalyticsMetrics>;
  byWard: Record<string, AnalyticsMetrics>;
  byDepartment: Record<string, AnalyticsMetrics>;
  trends: {
    date: string;
    submitted: number;
    resolved: number;
  }[];
}

export interface OfflineReport {
  tempId: string;
  data: Partial<Report>;
  media: File[];
  voiceNote?: File;
  createdAt: string;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed';
  retryCount: number;
}

export interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  language: 'en' | 'hi';
  isOnline: boolean;
  offlineQueue: OfflineReport[];
}
