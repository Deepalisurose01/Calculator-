// API service for backend communication
import axios, { AxiosInstance, AxiosError } from 'axios';
import type { Report, Category, Ward, Department, User, TimelineEvent, Notification, RoutingRule, DashboardStats } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async loginWithPhone(phone: string): Promise<{ success: boolean; message: string }> {
    const response = await this.client.post('/auth/login', { phone });
    return response.data;
  }

  async verifyOTP(phone: string, otp: string): Promise<{ token: string; user: User }> {
    const response = await this.client.post('/auth/verify-otp', { phone, otp });
    if (response.data.token) {
      localStorage.setItem('auth_token', response.data.token);
    }
    return response.data;
  }

  async loginAsGuest(deviceId: string): Promise<{ token: string; user: User }> {
    const response = await this.client.post('/auth/guest', { deviceId });
    if (response.data.token) {
      localStorage.setItem('auth_token', response.data.token);
    }
    return response.data;
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.client.get('/auth/me');
    return response.data;
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    const response = await this.client.get('/categories');
    return response.data;
  }

  // Wards
  async getWards(): Promise<Ward[]> {
    const response = await this.client.get('/wards');
    return response.data;
  }

  async getWardByLocation(lat: number, lng: number): Promise<Ward | null> {
    const response = await this.client.get(`/wards/by-location?lat=${lat}&lng=${lng}`);
    return response.data;
  }

  // Departments
  async getDepartments(): Promise<Department[]> {
    const response = await this.client.get('/departments');
    return response.data;
  }

  // Reports - Citizen endpoints
  async createReport(data: Partial<Report>): Promise<Report> {
    const response = await this.client.post('/reports', data);
    return response.data;
  }

  async getMyReports(page = 1, limit = 20): Promise<{ reports: Report[]; total: number; page: number }> {
    const response = await this.client.get(`/reports/my?page=${page}&limit=${limit}`);
    return response.data;
  }

  async getReportById(id: string): Promise<Report> {
    const response = await this.client.get(`/reports/${id}`);
    return response.data;
  }

  async getPublicReports(filters?: {
    categoryId?: string;
    wardId?: string;
    status?: string;
    bounds?: { north: number; south: number; east: number; west: number };
  }): Promise<Report[]> {
    const params = new URLSearchParams();
    if (filters?.categoryId) params.append('categoryId', filters.categoryId);
    if (filters?.wardId) params.append('wardId', filters.wardId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.bounds) {
      params.append('bounds', JSON.stringify(filters.bounds));
    }
    const response = await this.client.get(`/reports/public?${params.toString()}`);
    return response.data;
  }

  async upvoteReport(id: string): Promise<{ upvotes: number }> {
    const response = await this.client.post(`/reports/${id}/upvote`);
    return response.data;
  }

  async getReportTimeline(id: string): Promise<TimelineEvent[]> {
    const response = await this.client.get(`/reports/${id}/timeline`);
    return response.data;
  }

  // Media upload
  async getPresignedUploadUrl(fileName: string, fileType: string): Promise<{ uploadUrl: string; fileUrl: string; key: string }> {
    const response = await this.client.post('/media/presigned-url', { fileName, fileType });
    return response.data;
  }

  async uploadToPresignedUrl(url: string, file: File): Promise<void> {
    await axios.put(url, file, {
      headers: {
        'Content-Type': file.type,
      },
    });
  }

  async addMediaToReport(reportId: string, media: {
    mediaType: string;
    originalUrl: string;
    fileSize: number;
    mimeType: string;
    width?: number;
    height?: number;
    exifData?: Record<string, any>;
  }): Promise<void> {
    await this.client.post(`/reports/${reportId}/media`, media);
  }

  // Notifications
  async getMyNotifications(page = 1, limit = 20): Promise<{ notifications: Notification[]; total: number }> {
    const response = await this.client.get(`/notifications?page=${page}&limit=${limit}`);
    return response.data;
  }

  async markNotificationRead(id: string): Promise<void> {
    await this.client.patch(`/notifications/${id}/read`);
  }

  async markAllNotificationsRead(): Promise<void> {
    await this.client.patch('/notifications/read-all');
  }

  async registerFCMToken(token: string): Promise<void> {
    await this.client.post('/notifications/fcm-token', { token });
  }

  // Feedback
  async submitFeedback(reportId: string, feedback: {
    rating: number;
    feedbackText?: string;
    resolutionSatisfaction?: number;
    responseTimeSatisfaction?: number;
  }): Promise<void> {
    await this.client.post(`/reports/${reportId}/feedback`, feedback);
  }

  // Admin endpoints
  async getAdminReports(filters?: {
    status?: string;
    priority?: string;
    categoryId?: string;
    wardId?: string;
    departmentId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ reports: Report[]; total: number; page: number }> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.categoryId) params.append('categoryId', filters.categoryId);
    if (filters?.wardId) params.append('wardId', filters.wardId);
    if (filters?.departmentId) params.append('departmentId', filters.departmentId);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
    const response = await this.client.get(`/admin/reports?${params.toString()}`);
    return response.data;
  }

  async assignReport(reportId: string, data: {
    departmentId: string;
    assignedToUserId?: string;
    notes?: string;
    dueDate?: string;
  }): Promise<void> {
    await this.client.post(`/admin/reports/${reportId}/assign`, data);
  }

  async updateReportStatus(reportId: string, status: string, comment?: string): Promise<void> {
    await this.client.patch(`/admin/reports/${reportId}/status`, { status, comment });
  }

  async getDashboardStats(period?: 'today' | 'week' | 'month'): Promise<DashboardStats> {
    const response = await this.client.get(`/admin/analytics/dashboard?period=${period || 'today'}`);
    return response.data;
  }

  // Routing rules
  async getRoutingRules(): Promise<RoutingRule[]> {
    const response = await this.client.get('/admin/routing-rules');
    return response.data;
  }

  async createRoutingRule(rule: Partial<RoutingRule>): Promise<RoutingRule> {
    const response = await this.client.post('/admin/routing-rules', rule);
    return response.data;
  }

  async updateRoutingRule(id: string, rule: Partial<RoutingRule>): Promise<RoutingRule> {
    const response = await this.client.patch(`/admin/routing-rules/${id}`, rule);
    return response.data;
  }

  async deleteRoutingRule(id: string): Promise<void> {
    await this.client.delete(`/admin/routing-rules/${id}`);
  }

  // Geocoding
  async reverseGeocode(lat: number, lng: number): Promise<{ address: string; ward?: Ward }> {
    const response = await this.client.get(`/geocode/reverse?lat=${lat}&lng=${lng}`);
    return response.data;
  }
}

export const api = new ApiService();
export default api;
