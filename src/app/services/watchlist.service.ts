import { Injectable } from '@angular/core';

export interface WatchlistItem {
  tmdbID: string;
  mediaType: 'movie' | 'tv';
  title?: string;
  name?: string;
  poster_path?: string;
  overview?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  genre_ids?: number[];
  addedAt: number; // timestamp when added to watchlist
}

@Injectable({
  providedIn: 'root'
})
export class WatchlistService {
  private readonly key = 'userWatchlist';
  private readonly maxEntries = 500;
  private memoryCache: WatchlistItem[] | null = null;
  private cacheTimestamp = 0;
  private readonly CACHE_TTL = 30000; // 30 seconds

  constructor() {}

  /**
   * Check if watchlist feature is enabled
   */
  private isEnabled(): boolean {
    try {
      const settings = localStorage.getItem('appSettings');
      if (settings) {
        const parsed = JSON.parse(settings);
        return parsed.enableWatchlist !== false; // Default to enabled
      }
      return true;
    } catch {
      return true;
    }
  }

  /**
   * Get the watchlist, using in-memory cache for speed
   */
  getWatchlist(): WatchlistItem[] {
    if (!this.isEnabled()) return [];
    
    const now = Date.now();
    if (this.memoryCache && now - this.cacheTimestamp < this.CACHE_TTL) {
      return this.memoryCache;
    }

    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) {
        this.memoryCache = [];
        this.cacheTimestamp = now;
        return [];
      }

      let parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error('Corrupted');

      // Sort by most recently added
      parsed.sort((a, b) => b.addedAt - a.addedAt);

      this.memoryCache = parsed;
      this.cacheTimestamp = now;
      return parsed;
    } catch (e) {
      console.warn('WatchlistService: Corrupted localStorage, resetting.', e);
      localStorage.removeItem(this.key);
      this.memoryCache = [];
      this.cacheTimestamp = now;
      return [];
    }
  }

  /**
   * Save the watchlist to localStorage and update cache
   */
  private saveWatchlist(list: WatchlistItem[]): void {
    if (!this.isEnabled()) return;
    
    this.memoryCache = list;
    this.cacheTimestamp = Date.now();
    localStorage.setItem(this.key, JSON.stringify(list));
  }

  /**
   * Add an item to the watchlist
   */
  addToWatchlist(item: Omit<WatchlistItem, 'addedAt'>): boolean {
    if (!this.isEnabled()) return false;

    try {
      let watchlist = this.getWatchlist();
      
      // Check if item already exists
      const exists = watchlist.some(
        existing => existing.tmdbID === item.tmdbID && existing.mediaType === item.mediaType
      );

      if (exists) {
        return false; // Already in watchlist
      }

      // Add new item at the beginning
      const newItem: WatchlistItem = {
        ...item,
        addedAt: Date.now()
      };

      watchlist.unshift(newItem);

      // Limit the size
      if (watchlist.length > this.maxEntries) {
        watchlist = watchlist.slice(0, this.maxEntries);
      }

      this.saveWatchlist(watchlist);
      return true;
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      return false;
    }
  }

  /**
   * Remove an item from the watchlist
   */
  removeFromWatchlist(tmdbID: string, mediaType: 'movie' | 'tv'): boolean {
    if (!this.isEnabled()) return false;

    try {
      let watchlist = this.getWatchlist();
      const originalLength = watchlist.length;
      
      watchlist = watchlist.filter(
        item => !(item.tmdbID === tmdbID && item.mediaType === mediaType)
      );

      if (watchlist.length < originalLength) {
        this.saveWatchlist(watchlist);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      return false;
    }
  }

  /**
   * Check if an item is in the watchlist
   */
  isInWatchlist(tmdbID: string, mediaType: 'movie' | 'tv'): boolean {
    if (!this.isEnabled()) return false;

    try {
      const watchlist = this.getWatchlist();
      return watchlist.some(
        item => item.tmdbID === tmdbID && item.mediaType === mediaType
      );
    } catch {
      return false;
    }
  }

  /**
   * Get watchlist count
   */
  getWatchlistCount(): number {
    return this.getWatchlist().length;
  }

  /**
   * Clear entire watchlist
   */
  clearWatchlist(): void {
    if (!this.isEnabled()) return;
    
    this.memoryCache = [];
    this.cacheTimestamp = Date.now();
    localStorage.removeItem(this.key);
  }

  /**
   * Get watchlist filtered by media type
   */
  getWatchlistByType(mediaType: 'movie' | 'tv'): WatchlistItem[] {
    return this.getWatchlist().filter(item => item.mediaType === mediaType);
  }

  /**
   * Export watchlist data (for backup/sync)
   */
  exportWatchlist(): string {
    return JSON.stringify(this.getWatchlist());
  }

  /**
   * Import watchlist data (for backup/sync)
   */
  importWatchlist(data: string): boolean {
    if (!this.isEnabled()) return false;

    try {
      const imported = JSON.parse(data);
      if (!Array.isArray(imported)) return false;

      // Validate structure
      const valid = imported.every(item => 
        item.tmdbID && 
        item.mediaType && 
        ['movie', 'tv'].includes(item.mediaType) &&
        typeof item.addedAt === 'number'
      );

      if (!valid) return false;

      this.saveWatchlist(imported);
      return true;
    } catch {
      return false;
    }
  }
}
