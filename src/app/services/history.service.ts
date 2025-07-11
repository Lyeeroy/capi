import { Injectable } from '@angular/core';

export interface HistoryEntry {
  tmdbID: string;
  mediaType: 'movie' | 'tv';
  season?: number;
  episode?: number;
  poster_path?: string;
  title?: string;
  name?: string;
  deletedAt: number; // timestamp
  watchedPercentage?: number; // percentage watched when deleted
  reason: 'completed' | 'manual' | 'overflow'; // reason for deletion
}

@Injectable({ providedIn: 'root' })
export class HistoryService {
  private readonly key = 'watchHistory';
  private readonly maxEntries = 100;
  private memoryCache: HistoryEntry[] | null = null;
  private cacheTimestamp = 0;
  private readonly CACHE_TTL = 10000; // 10 seconds

  constructor() {}

  private isEnabled(): boolean {
    try {
      const raw = localStorage.getItem('appSettings');
      if (raw) {
        const settings = JSON.parse(raw);
        return settings.enableHistory !== false;
      }
    } catch {}
    return true;
  }

  /**
   * Get the history list, using in-memory cache for speed.
   */
  getList(): HistoryEntry[] {
    if (!this.isEnabled()) return [];

    const now = Date.now();
    if (this.memoryCache && now - this.cacheTimestamp < this.CACHE_TTL) {
      return this.memoryCache;
    }

    try {
      const raw = localStorage.getItem(this.key);
      const list = raw ? JSON.parse(raw) : [];
      this.memoryCache = list;
      this.cacheTimestamp = now;
      return list;
    } catch (error) {
      console.error('Error loading history:', error);
      this.memoryCache = [];
      this.cacheTimestamp = now;
      return [];
    }
  }

  /**
   * Save the history list to localStorage and update cache.
   */
  private saveList(list: HistoryEntry[]) {
    if (!this.isEnabled()) return;

    try {
      localStorage.setItem(this.key, JSON.stringify(list));
      this.memoryCache = list;
      this.cacheTimestamp = Date.now();
    } catch (error) {
      console.error('Error saving history:', error);
    }
  }

  /**
   * Add an entry to history
   */
  addEntry(entry: Omit<HistoryEntry, 'deletedAt'>) {
    if (!this.isEnabled()) return;

    let list = this.getList();

    // Remove any existing entry for the same item
    list = list.filter(
      (item) =>
        !(
          item.tmdbID === entry.tmdbID &&
          item.mediaType === entry.mediaType &&
          item.season === entry.season &&
          item.episode === entry.episode
        )
    );

    // Add new entry at the beginning
    const historyEntry: HistoryEntry = {
      ...entry,
      deletedAt: Date.now(),
    };

    list.unshift(historyEntry);

    // Keep only the most recent entries
    if (list.length > this.maxEntries) {
      list = list.slice(0, this.maxEntries);
    }

    this.saveList(list);
  }

  /**
   * Remove an entry from history
   */
  removeEntry(index: number) {
    if (!this.isEnabled()) return;

    let list = this.getList();
    if (index >= 0 && index < list.length) {
      list.splice(index, 1);
      this.saveList(list);
    }
  }

  /**
   * Clear all history
   */
  clearAll() {
    if (!this.isEnabled()) return;

    this.memoryCache = [];
    this.cacheTimestamp = Date.now();
    localStorage.removeItem(this.key);
  }

  /**
   * Get history grouped by date
   */
  getGroupedHistory(): { [key: string]: HistoryEntry[] } {
    const list = this.getList();
    const grouped: { [key: string]: HistoryEntry[] } = {};

    list.forEach((entry) => {
      const date = new Date(entry.deletedAt);
      const dateKey = date.toDateString();

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(entry);
    });

    return grouped;
  }

  /**
   * Get display title for history entry
   */
  getDisplayTitle(entry: HistoryEntry): string {
    const baseTitle = entry.title || entry.name || 'Unknown Title';

    if (entry.mediaType === 'tv' && entry.season && entry.episode) {
      return `${baseTitle} S${entry.season}E${entry.episode}`;
    }

    return baseTitle;
  }

  /**
   * Calculate and format the time ago
   */
  getTimeAgo(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  }
}
