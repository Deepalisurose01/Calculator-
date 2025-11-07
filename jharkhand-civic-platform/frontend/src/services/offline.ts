// Offline storage and sync service using IndexedDB
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { OfflineReport, Report } from '@/types';
import { api } from './api';

interface CivicDB extends DBSchema {
  offlineReports: {
    key: string;
    value: OfflineReport;
    indexes: { 'by-status': string; 'by-created': string };
  };
  mediaFiles: {
    key: string;
    value: {
      id: string;
      reportTempId: string;
      file: File;
      type: 'photo' | 'voice';
      createdAt: string;
    };
  };
  categories: {
    key: string;
    value: any;
  };
  wards: {
    key: string;
    value: any;
  };
}

class OfflineService {
  private db: IDBPDatabase<CivicDB> | null = null;
  private syncInProgress = false;

  async init(): Promise<void> {
    this.db = await openDB<CivicDB>('jharkhand-civic-db', 1, {
      upgrade(db) {
        // Offline reports store
        const offlineStore = db.createObjectStore('offlineReports', { keyPath: 'tempId' });
        offlineStore.createIndex('by-status', 'syncStatus');
        offlineStore.createIndex('by-created', 'createdAt');

        // Media files store
        db.createObjectStore('mediaFiles', { keyPath: 'id' });

        // Cache stores
        db.createObjectStore('categories', { keyPath: 'id' });
        db.createObjectStore('wards', { keyPath: 'id' });
      },
    });
  }

  // Queue a report for offline submission
  async queueReport(report: Partial<Report>, media: File[], voiceNote?: File): Promise<string> {
    if (!this.db) await this.init();

    const tempId = `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const offlineReport: OfflineReport = {
      tempId,
      data: report,
      media: [],
      createdAt: new Date().toISOString(),
      syncStatus: 'pending',
      retryCount: 0,
    };

    await this.db!.put('offlineReports', offlineReport);

    // Store media files separately
    for (let i = 0; i < media.length; i++) {
      await this.db!.put('mediaFiles', {
        id: `${tempId}-photo-${i}`,
        reportTempId: tempId,
        file: media[i],
        type: 'photo',
        createdAt: new Date().toISOString(),
      });
    }

    if (voiceNote) {
      await this.db!.put('mediaFiles', {
        id: `${tempId}-voice`,
        reportTempId: tempId,
        file: voiceNote,
        type: 'voice',
        createdAt: new Date().toISOString(),
      });
    }

    return tempId;
  }

  // Get all queued reports
  async getQueuedReports(): Promise<OfflineReport[]> {
    if (!this.db) await this.init();
    return await this.db!.getAllFromIndex('offlineReports', 'by-status', 'pending');
  }

  // Sync all pending reports
  async syncPendingReports(): Promise<void> {
    if (this.syncInProgress) return;
    if (!navigator.onLine) return;

    this.syncInProgress = true;

    try {
      const pendingReports = await this.getQueuedReports();

      for (const offlineReport of pendingReports) {
        try {
          await this.syncReport(offlineReport);
        } catch (error) {
          console.error('Failed to sync report:', offlineReport.tempId, error);
          
          // Update retry count
          offlineReport.retryCount += 1;
          offlineReport.syncStatus = offlineReport.retryCount >= 3 ? 'failed' : 'pending';
          await this.db!.put('offlineReports', offlineReport);
        }
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  // Sync a single report
  private async syncReport(offlineReport: OfflineReport): Promise<void> {
    if (!this.db) await this.init();

    // Update status to syncing
    offlineReport.syncStatus = 'syncing';
    await this.db!.put('offlineReports', offlineReport);

    // Get associated media files
    const allMedia = await this.db!.getAll('mediaFiles');
    const reportMedia = allMedia.filter(m => m.reportTempId === offlineReport.tempId);

    // Upload media files first
    const mediaUrls: Array<{
      mediaType: string;
      originalUrl: string;
      fileSize: number;
      mimeType: string;
      width?: number;
      height?: number;
    }> = [];

    for (const mediaItem of reportMedia) {
      try {
        // Get presigned URL
        const { uploadUrl, fileUrl } = await api.getPresignedUploadUrl(
          mediaItem.file.name,
          mediaItem.file.type
        );

        // Upload file
        await api.uploadToPresignedUrl(uploadUrl, mediaItem.file);

        // Get image dimensions if it's a photo
        let width: number | undefined;
        let height: number | undefined;
        
        if (mediaItem.type === 'photo' && mediaItem.file.type.startsWith('image/')) {
          const dimensions = await this.getImageDimensions(mediaItem.file);
          width = dimensions.width;
          height = dimensions.height;
        }

        mediaUrls.push({
          mediaType: mediaItem.type,
          originalUrl: fileUrl,
          fileSize: mediaItem.file.size,
          mimeType: mediaItem.file.type,
          width,
          height,
        });

        // Delete from IndexedDB
        await this.db!.delete('mediaFiles', mediaItem.id);
      } catch (error) {
        console.error('Failed to upload media:', mediaItem.id, error);
        throw error;
      }
    }

    // Create report with media URLs
    const reportData = {
      ...offlineReport.data,
      voiceNoteUrl: mediaUrls.find(m => m.mediaType === 'voice')?.originalUrl,
    };

    const createdReport = await api.createReport(reportData);

    // Add media records to report
    for (const media of mediaUrls.filter(m => m.mediaType === 'photo')) {
      await api.addMediaToReport(createdReport.id, media);
    }

    // Mark as synced
    offlineReport.syncStatus = 'synced';
    await this.db!.put('offlineReports', offlineReport);

    // Clean up after successful sync (optional - keep for history)
    // await this.db!.delete('offlineReports', offlineReport.tempId);
  }

  // Helper to get image dimensions
  private getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.width, height: img.height });
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };
      
      img.src = url;
    });
  }

  // Cache categories for offline use
  async cacheCategories(categories: any[]): Promise<void> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction('categories', 'readwrite');
    await Promise.all(categories.map(cat => tx.store.put(cat)));
    await tx.done;
  }

  async getCachedCategories(): Promise<any[]> {
    if (!this.db) await this.init();
    return await this.db!.getAll('categories');
  }

  // Cache wards for offline use
  async cacheWards(wards: any[]): Promise<void> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction('wards', 'readwrite');
    await Promise.all(wards.map(ward => tx.store.put(ward)));
    await tx.done;
  }

  async getCachedWards(): Promise<any[]> {
    if (!this.db) await this.init();
    return await this.db!.getAll('wards');
  }

  // Clear all offline data
  async clearAll(): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.clear('offlineReports');
    await this.db!.clear('mediaFiles');
  }
}

export const offlineService = new OfflineService();
export default offlineService;
