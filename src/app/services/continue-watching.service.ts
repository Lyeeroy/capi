import { Injectable, inject } from '@angular/core';
import { HistoryService } from './history.service';

export interface ContinueWatchingEntry {
  tmdbID: string;
  mediaType: 'movie' | 'tv';
  season?: number;
  episode?: number;
  currentTime: number;
  duration: number;
  poster_path?: string;
  title?: string;
  name?: string;
}

@Injectable({ providedIn: 'root' })
export class ContinueWatchingService {
  private readonly key = 'continueWatching';
  private readonly maxEntries = 30;
  private memoryCache: ContinueWatchingEntry[] | null = null;
  private cacheTimestamp = 0;
  private readonly CACHE_TTL = 30000; // 30 seconds - increased for better performance
  private readonly PROGRESS_THRESHOLD = 0.9;
  private readonly TV_MIN_DURATION = 900; // 15 minutes
  private readonly MOVIE_MIN_DURATION = 1800; // 30 minutes

  private sessionCache: Map<string, any> = new Map(); // Use Map for better performance
  private historyService = inject(HistoryService);
  private filterCache: {
    list: ContinueWatchingEntry[];
    timestamp: number;
  } | null = null;
  private readonly FILTER_CACHE_TTL = 5000; // 5 seconds filter cache

  constructor() {
    this.cleanupOldSessionData();
  }

  private isEnabled(): boolean {
    try {
      const raw = localStorage.getItem('appSettings');
      if (raw) {
        const settings = JSON.parse(raw);
        return settings.enableContinueWatching !== false;
      }
    } catch {}
    return true;
  }

  /**
   * Optimized getList with improved caching and debounced filtering
   */
  getList(): ContinueWatchingEntry[] {
    if (!this.isEnabled()) return [];

    const now = Date.now();

    // Use cached result if still valid
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

      // Apply optimized filtering with caching
      parsed = this.applyOptimizedFiltering(parsed);

      this.memoryCache = parsed;
      this.cacheTimestamp = now;
      return parsed;
    } catch (e) {
      console.warn(
        'ContinueWatchingService: Corrupted localStorage, resetting.',
        e
      );
      localStorage.removeItem(this.key);
      this.memoryCache = [];
      this.cacheTimestamp = now;
      return [];
    }
  }

  /**
   * Optimized filtering with caching to reduce redundant operations
   */
  private applyOptimizedFiltering(
    entries: ContinueWatchingEntry[]
  ): ContinueWatchingEntry[] {
    const now = Date.now();

    // Use filter cache if available and valid
    if (
      this.filterCache &&
      now - this.filterCache.timestamp < this.FILTER_CACHE_TTL
    ) {
      if (entries.length === this.filterCache.list.length) {
        return this.filterCache.list;
      }
    }

    const filtered = entries.filter((entry: ContinueWatchingEntry) => {
      // Keep entries without duration (just started)
      if (!entry.duration) return true;

      // Keep entries with currentTime = 0 (restarts)
      if (entry.currentTime === 0) return true;

      // Handle completed content
      if (entry.currentTime >= entry.duration) {
        if (entry.mediaType === 'movie') {
          return false;
        }
        return true;
      }

      return true;
    });

    // Cache the filtered result
    this.filterCache = { list: filtered, timestamp: now };
    return filtered;
  }

  /**
   * Optimized save with cache invalidation
   */
  private saveList(list: ContinueWatchingEntry[]): void {
    this.memoryCache = list;
    this.cacheTimestamp = Date.now();
    this.filterCache = null; // Invalidate filter cache
    localStorage.setItem(this.key, JSON.stringify(list));
  }

  /**
   * Optimized filterOutEntry using Set for better performance
   */
  private filterOutEntry(
    list: ContinueWatchingEntry[],
    tmdbID: string,
    mediaType: string
  ): ContinueWatchingEntry[] {
    // Use Set for O(1) lookups instead of array.filter
    const entryKey = `${tmdbID}_${mediaType}`;
    return list.filter((e) => `${e.tmdbID}_${e.mediaType}` !== entryKey);
  }

  /**
   * Save or update the continue watching entry.
   * For TV: If finished, advance to next episode.
   * For Movie: If finished, remove from list.
   *
   * RESTART SUPPORT: Setting currentTime = 0 will restart the episode from the beginning,
   * bypassing regression protection to allow legitimate restarts.
   *
   * Foolproof: Prevent accidental overwrite if user goes back to a lower episode.
   */
  /**
   * Optimized saveOrAdvance with reduced logging and batched operations
   */
  saveOrAdvance(
    entry: ContinueWatchingEntry,
    totalEpisodesInSeason?: number,
    totalSeasons?: number
  ) {
    if (!this.isEnabled()) return;

    // Validate the entry has basic required data
    if (!entry.tmdbID || !entry.mediaType) {
      return;
    }

    // Clean up old episode data for previous episodes in this season (TV only)
    if (entry.mediaType === 'tv' && entry.episode && entry.season) {
      this.cleanupOldEpisodeData(entry.tmdbID, entry.season, entry.episode);
    }

    let list = this.getList();
    list = this.filterOutEntry(list, entry.tmdbID, entry.mediaType);

    // Apply regression protection only for TV shows with sufficient duration
    if (
      entry.mediaType === 'tv' &&
      entry.episode &&
      entry.season &&
      entry.duration > 30
    ) {
      const shouldProceed = this.saveEpisodeProgressFoolproofAndCheck(
        entry.tmdbID,
        entry.season,
        entry.episode,
        entry.currentTime,
        entry.duration
      );
      if (!shouldProceed) {
        return;
      }
    }

    const shouldRemoveNow = this.shouldRemove(entry);
    if (shouldRemoveNow) {
      // Save to history before removing (completion)
      const watchedPercentage = entry.duration
        ? (entry.currentTime / entry.duration) * 100
        : 100;

      this.historyService.addEntry({
        tmdbID: entry.tmdbID,
        mediaType: entry.mediaType,
        season: entry.season,
        episode: entry.episode,
        poster_path: entry.poster_path,
        title: entry.title,
        name: entry.name,
        watchedPercentage: watchedPercentage,
        reason: 'completed',
      });

      if (entry.mediaType === 'tv' && entry.episode && entry.season) {
        this.markEpisodeAsWatchedInPlaylist(
          entry.tmdbID,
          entry.season,
          entry.episode
        );
        // Remove session/progress data for this episode
        const sessionKey = `ep_session_${entry.tmdbID}_s${entry.season}_e${entry.episode}`;
        const progressKey = `ep_progress_${entry.tmdbID}_s${entry.season}_e${entry.episode}`;
        this.removeSessionData(sessionKey);
        localStorage.removeItem(progressKey);
      }
      if (entry.mediaType === 'tv' && entry.episode && totalEpisodesInSeason) {
        if (entry.episode < totalEpisodesInSeason) {
          const nextEntry: ContinueWatchingEntry = {
            ...entry,
            episode: entry.episode + 1,
            currentTime: 0,
          };
          list.unshift(nextEntry);
        } else if (
          totalSeasons &&
          entry.season &&
          entry.season < totalSeasons
        ) {
          const nextSeasonEntry: ContinueWatchingEntry = {
            ...entry,
            season: entry.season + 1,
            episode: 1,
            currentTime: 0,
          };
          list.unshift(nextSeasonEntry);
        }
      }
    } else {
      // Add entry to the list
      list.unshift(entry);
    }

    // Handle overflow - save removed items to history
    if (list.length > this.maxEntries) {
      const removedItems = list.slice(this.maxEntries);
      removedItems.forEach((removedEntry) => {
        const watchedPercentage = removedEntry.duration
          ? (removedEntry.currentTime / removedEntry.duration) * 100
          : 0;

        this.historyService.addEntry({
          tmdbID: removedEntry.tmdbID,
          mediaType: removedEntry.mediaType,
          season: removedEntry.season,
          episode: removedEntry.episode,
          poster_path: removedEntry.poster_path,
          title: removedEntry.title,
          name: removedEntry.name,
          watchedPercentage: watchedPercentage,
          reason: 'overflow',
        });
      });

      list = list.slice(0, this.maxEntries);
    }

    this.saveList(list);
  }

  shouldRemove(entry: ContinueWatchingEntry): boolean {
    const minDuration =
      entry.mediaType === 'tv' ? this.TV_MIN_DURATION : this.MOVIE_MIN_DURATION;

    // Don't remove if duration is not set or too small (likely just started)
    if (!entry.duration || entry.duration < minDuration) {
      // Special case: for movies with very short durations, only remove if explicitly completed
      if (
        entry.mediaType === 'movie' &&
        entry.duration > 0 &&
        entry.currentTime >= entry.duration
      ) {
        return true;
      }
      return false;
    }

    // Don't remove if currentTime is 0 (restart scenario)
    if (entry.currentTime === 0) return false;

    // Remove if completed (currentTime >= duration)
    return entry.currentTime >= entry.duration;
  }

  removeEntry(index: number) {
    if (!this.isEnabled()) return;
    let list = this.getList();

    // Save to history before removing
    if (index >= 0 && index < list.length) {
      const entry = list[index];
      const watchedPercentage = entry.duration
        ? (entry.currentTime / entry.duration) * 100
        : 0;

      this.historyService.addEntry({
        tmdbID: entry.tmdbID,
        mediaType: entry.mediaType,
        season: entry.season,
        episode: entry.episode,
        poster_path: entry.poster_path,
        title: entry.title,
        name: entry.name,
        watchedPercentage: watchedPercentage,
        reason: 'manual',
      });

      list.splice(index, 1);
      this.saveList(list);
    }
  }

  remove(tmdbID: string, mediaType: string) {
    if (!this.isEnabled()) return;
    let list = this.getList();

    // Save items to history before removing
    const itemsToRemove = list.filter(
      (entry) => entry.tmdbID === tmdbID && entry.mediaType === mediaType
    );

    itemsToRemove.forEach((entry) => {
      const watchedPercentage = entry.duration
        ? (entry.currentTime / entry.duration) * 100
        : 0;

      this.historyService.addEntry({
        tmdbID: entry.tmdbID,
        mediaType: entry.mediaType,
        season: entry.season,
        episode: entry.episode,
        poster_path: entry.poster_path,
        title: entry.title,
        name: entry.name,
        watchedPercentage: watchedPercentage,
        reason: 'manual',
      });
    });

    list = this.filterOutEntry(list, tmdbID, mediaType);
    this.saveList(list);
  }

  clearAll() {
    if (!this.isEnabled()) return;

    // Save all items to history before clearing
    const list = this.getList();
    list.forEach((entry) => {
      const watchedPercentage = entry.duration
        ? (entry.currentTime / entry.duration) * 100
        : 0;

      this.historyService.addEntry({
        tmdbID: entry.tmdbID,
        mediaType: entry.mediaType,
        season: entry.season,
        episode: entry.episode,
        poster_path: entry.poster_path,
        title: entry.title,
        name: entry.name,
        watchedPercentage: watchedPercentage,
        reason: 'manual',
      });
    });

    this.memoryCache = [];
    this.cacheTimestamp = Date.now();
    localStorage.removeItem(this.key);
  }

  overwriteList(newList: ContinueWatchingEntry[]) {
    if (!this.isEnabled()) return;
    this.saveList(newList);
  }

  /**
   * Mark an episode as watched in the playlist system
   * @param tmdbID The TMDB ID of the show
   * @param season The season number
   * @param episode The episode number
   */
  private markEpisodeAsWatchedInPlaylist(
    tmdbID: string,
    season: number,
    episode: number
  ): void {
    try {
      const watchedKey = `watched_episodes_${tmdbID}`;
      const episodeKey = `s${season}e${episode}`;

      // Get existing watched episodes
      const watchedData = localStorage.getItem(watchedKey);
      let watchedSet: Set<string>;

      if (watchedData) {
        const watchedArray = JSON.parse(watchedData);
        watchedSet = new Set(watchedArray);
      } else {
        watchedSet = new Set();
      }

      // Add this episode to watched set
      watchedSet.add(episodeKey);

      // Save back to localStorage
      const watchedArray = Array.from(watchedSet);
      localStorage.setItem(watchedKey, JSON.stringify(watchedArray));
    } catch (error) {
      console.error('Error marking episode as watched in playlist:', error);
    }
  }

  /**
   * Remove episode from watched list
   * @param tmdbID The TMDB ID of the show
   * @param season The season number
   * @param episode The episode number
   */
  private unmarkEpisodeAsWatched(
    tmdbID: string,
    season: number,
    episode: number
  ): void {
    try {
      const watchedKey = `watched_episodes_${tmdbID}`;
      const episodeKey = `s${season}e${episode}`;
      const watchedData = localStorage.getItem(watchedKey);

      if (watchedData) {
        const watchedArray = JSON.parse(watchedData);
        const watchedSet = new Set(watchedArray);
        watchedSet.delete(episodeKey);

        if (watchedSet.size > 0) {
          localStorage.setItem(
            watchedKey,
            JSON.stringify(Array.from(watchedSet))
          );
        } else {
          localStorage.removeItem(watchedKey);
        }
      }
    } catch (error) {
      console.warn('Failed to unmark episode as watched:', error);
    }
  }

  /**
   * Check if a specific episode has been watched (completed)
   * @param tmdbID The TMDB ID of the show
   * @param season The season number
   * @param episode The episode number
   * @returns boolean indicating if the episode has been watched
   */
  isEpisodeWatched(tmdbID: string, season: number, episode: number): boolean {
    if (!this.isEnabled()) return false;
    try {
      // First check the playlist system (watched_episodes)
      const watchedKey = `watched_episodes_${tmdbID}`;
      const episodeKey = `s${season}e${episode}`;
      const watchedData = localStorage.getItem(watchedKey);
      if (watchedData) {
        const watchedArray = JSON.parse(watchedData);
        const watchedSet = new Set(watchedArray);
        if (watchedSet.has(episodeKey)) {
          return true;
        }
      }
      // Check the highest watched episode tracker
      const highestWatched = this.getHighestWatched(tmdbID, season);
      if (highestWatched > episode) {
        return true;
      }
      // Check current continue watching list for this episode
      const cwList = this.getList();
      const entry = cwList.find(
        (e) =>
          e.tmdbID === tmdbID &&
          e.mediaType === 'tv' &&
          e.season === season &&
          e.episode === episode
      );
      if (
        entry &&
        entry.duration > 0 &&
        entry.currentTime >= entry.duration * this.PROGRESS_THRESHOLD
      ) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Get a list of all watched episodes for a show season
   * @param tmdbID The TMDB ID of the show
   * @param season The season number
   * @returns Array of episode numbers that have been watched
   */
  getWatchedEpisodes(tmdbID: string, season: number): number[] {
    if (!this.isEnabled()) return [];

    try {
      const watchedEpisodes: number[] = [];

      // First check the playlist system (watched_episodes)
      const watchedKey = `watched_episodes_${tmdbID}`;
      const watchedData = localStorage.getItem(watchedKey);

      if (watchedData) {
        const watchedArray = JSON.parse(watchedData);
        const watchedSet = new Set(watchedArray);

        // Find episodes for this season
        watchedSet.forEach((episodeKey) => {
          if (typeof episodeKey === 'string') {
            const match = episodeKey.match(/^s(\d+)e(\d+)$/);
            if (match && parseInt(match[1]) === season) {
              const episodeNum = parseInt(match[2]);
              if (!watchedEpisodes.includes(episodeNum)) {
                watchedEpisodes.push(episodeNum);
              }
            }
          }
        });
      }

      // Get highest watched episode from continue watching system
      const highestWatched = this.getHighestWatched(tmdbID, season);
      for (let i = 1; i < highestWatched; i++) {
        if (!watchedEpisodes.includes(i)) {
          watchedEpisodes.push(i);
        }
      }

      // Check current continue watching list for additional watched episodes
      const cwList = this.getList();
      cwList.forEach((entry) => {
        if (
          entry.tmdbID === tmdbID &&
          entry.mediaType === 'tv' &&
          entry.season === season &&
          typeof entry.episode === 'number' &&
          entry.duration > 0 &&
          entry.currentTime >= entry.duration * this.PROGRESS_THRESHOLD &&
          !watchedEpisodes.includes(entry.episode)
        ) {
          watchedEpisodes.push(entry.episode);
        }
      });

      return watchedEpisodes.sort((a, b) => a - b);
    } catch {
      return [];
    }
  }

  /**
   * Mark an episode as accessed/started (called when navigating to episode via continue watching)
   * This ensures the episode gets marked in the playlist system
   * @param tmdbID The TMDB ID of the show
   * @param season The season number
   * @param episode The episode number
   */
  markEpisodeAsAccessed(tmdbID: string, season: number, episode: number): void {
    if (!this.isEnabled()) return;

    // Check if this episode was previously completed
    const highestWatched = this.getHighestWatched(tmdbID, season);
    if (episode < highestWatched) {
      this.markEpisodeAsWatchedInPlaylist(tmdbID, season, episode);
    }

    // Also check if this episode was completed in previous sessions
    const cwList = this.getList();
    const hasCompletedEntry = cwList.some(
      (entry) =>
        entry.tmdbID === tmdbID &&
        entry.mediaType === 'tv' &&
        entry.season === season &&
        entry.episode === episode &&
        entry.duration > 0 &&
        entry.currentTime >= entry.duration * this.PROGRESS_THRESHOLD
    );

    if (hasCompletedEntry) {
      this.markEpisodeAsWatchedInPlaylist(tmdbID, season, episode);
    }
  }

  /**
   * Clean up inconsistent continue watching entries and synchronize with playlist system
   * This method ensures that episodes marked as watched in playlist are properly reflected
   * in the continue watching system
   */
  cleanupAndSynchronize(): void {
    if (!this.isEnabled()) return;

    try {
      // Get all watched episodes from localStorage
      const keys = Object.keys(localStorage);
      const watchedEpisodesKeys = keys.filter((key) =>
        key.startsWith('watched_episodes_')
      );

      watchedEpisodesKeys.forEach((watchedKey) => {
        try {
          const tmdbID = watchedKey.replace('watched_episodes_', '');
          const watchedData = localStorage.getItem(watchedKey);

          if (watchedData) {
            const watchedArray = JSON.parse(watchedData);
            const watchedSet = new Set(watchedArray);

            // Process each watched episode
            watchedSet.forEach((episodeKey) => {
              if (typeof episodeKey === 'string') {
                const match = episodeKey.match(/^s(\d+)e(\d+)$/);
                if (match) {
                  const season = parseInt(match[1]);
                  const episode = parseInt(match[2]);
                  const currentHighest = this.getHighestWatched(tmdbID, season);
                  if (episode > currentHighest) {
                    this.setHighestWatched(tmdbID, season, episode);
                  }
                }
              }
            });
          }
        } catch (error) {
          console.error(
            'Error processing watched episodes for key:',
            watchedKey,
            error
          );
        }
      });
    } catch (error) {
      console.error('Error during cleanup and synchronization:', error as any);
    }
  }

  /**
   * Process completed episodes and advance them to next episodes
   * This should be called explicitly when needed, not during casual list reading
   */
  processCompletedEpisodes(): void {
    if (!this.isEnabled()) return;

    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return;

      let list = JSON.parse(raw);
      if (!Array.isArray(list)) return;

      let hasChanges = false;

      // Process each entry for auto-advancement
      list = list.map((entry: ContinueWatchingEntry) => {
        if (!entry.duration || entry.currentTime < entry.duration) {
          return entry;
        }

        // Episode is completed
        if (entry.mediaType === 'tv' && entry.episode) {
          // Mark as watched in playlist system
          if (entry.season) {
            this.markEpisodeAsWatchedInPlaylist(
              entry.tmdbID,
              entry.season,
              entry.episode
            );
          }

          // Advance to next episode
          hasChanges = true;
          return {
            ...entry,
            episode: entry.episode + 1,
            currentTime: 0,
            // duration will be updated by the player on next watch
          };
        }

        // For movies, they should be removed by getList() filter
        return entry;
      });

      // Only save if there were changes
      if (hasChanges) {
        // Limit size
        if (list.length > this.maxEntries) {
          list = list.slice(0, this.maxEntries);
        }
        localStorage.setItem(this.key, JSON.stringify(list));
      }
    } catch (error) {
      console.error('Error processing completed episodes:', error);
    }
  }

  /**
   * Get the watch progress for a specific episode
   * @param tmdbID The TMDB ID of the show
   * @param season The season number
   * @param episode The episode number
   * @returns Object with currentTime, duration, and progress ratio (0-1)
   */
  getEpisodeProgress(
    tmdbID: string,
    season: number,
    episode: number
  ): {
    currentTime: number;
    duration: number;
    progress: number;
  } {
    const defaultResult = { currentTime: 0, duration: 0, progress: 0 };

    if (!this.isEnabled()) return defaultResult;

    try {
      // Check current continue watching list for this specific episode
      const cwList = this.getList();
      const entry = cwList.find(
        (e) =>
          e.tmdbID === tmdbID &&
          e.mediaType === 'tv' &&
          e.season === season &&
          e.episode === episode
      );

      if (entry && entry.duration > 0) {
        const progress = Math.min(
          1,
          Math.max(0, entry.currentTime / entry.duration)
        );
        return {
          currentTime: entry.currentTime,
          duration: entry.duration,
          progress: progress,
        };
      }

      // If not in continue watching, check if episode is marked as watched
      if (this.isEpisodeWatched(tmdbID, season, episode)) {
        // Return full progress for watched episodes
        return {
          currentTime: 0, // We don't store the exact time for completed episodes
          duration: 0,
          progress: 1,
        };
      }

      return defaultResult;
    } catch {
      return defaultResult;
    }
  }

  /**
   * Remove episode progress and mark as unwatched
   * Enhanced to clean up all related storage keys
   * @param tmdbID The TMDB ID of the show
   * @param season The season number
   * @param episode The episode number
   */
  removeEpisodeProgress(tmdbID: string, season: number, episode: number): void {
    if (!this.isEnabled()) return;

    try {
      // Remove from continue watching list
      let cwList = this.getList();
      cwList = cwList.filter(
        (e) =>
          !(
            e.tmdbID === tmdbID &&
            e.mediaType === 'tv' &&
            e.season === season &&
            e.episode === episode
          )
      );
      localStorage.setItem(this.key, JSON.stringify(cwList));

      // Remove dedicated episode progress storage (old system - cleanup)
      const progressKey = `ep_progress_${tmdbID}_s${season}_e${episode}`;
      localStorage.removeItem(progressKey);

      // Remove session tracking
      const sessionKey = `ep_session_${tmdbID}_s${season}_e${episode}`;
      this.removeSessionData(sessionKey);

      // Remove from watched episodes
      this.unmarkEpisodeAsWatched(tmdbID, season, episode);

      // Update highest episode if necessary
      try {
        const currentHighest = this.getHighestWatched(tmdbID, season);
        if (episode === currentHighest) {
          // Find the new highest episode that still has progress
          let newHighest = 0;
          for (let ep = episode - 1; ep >= 1; ep--) {
            if (this.isEpisodeWatched(tmdbID, season, ep)) {
              newHighest = ep;
              break;
            }
          }
          if (newHighest > 0) {
            this.setHighestWatched(tmdbID, season, newHighest);
          } else {
            this.removeHighestWatched(tmdbID, season);
          }
        }
      } catch {}
    } catch (error) {
      console.warn('Failed to remove episode progress:', error);
    }
  }

  /**
   * Remove all watched episodes for a series
   * @param tmdbID The TMDB ID of the show
   */
  removeAllWatchedEpisodes(tmdbID: string): void {
    if (!this.isEnabled()) return;

    try {
      // Remove all continue watching entries for this series
      let cwList = this.getList();
      cwList = cwList.filter(
        (e) => !(e.tmdbID === tmdbID && e.mediaType === 'tv')
      );
      localStorage.setItem(this.key, JSON.stringify(cwList));

      // Remove watched episodes
      const watchedKey = `watched_episodes_${tmdbID}`;
      localStorage.removeItem(watchedKey);
      // Remove all season highest trackers (now single-key)
      this.removeAllHighestWatched(tmdbID);
      // Remove pending keys
      const keys = Object.keys(localStorage);
      const pendingKeys = keys.filter((key) =>
        key.startsWith(`cw_pending_${tmdbID}_s`)
      );
      pendingKeys.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      console.error('Error removing all watched episodes:', error);
    }
  }

  /**
   * Enhanced fool-proof progress saving for TV episodes
   * Prevents accidental overwrites when users jump around episodes
   * @returns true if the save should proceed, false if it should be blocked
   */
  private saveEpisodeProgressFoolproofAndCheck(
    tmdbID: string,
    season: number,
    episode: number,
    currentTime: number,
    duration: number
  ): boolean {
    if (!this.isEnabled() || !duration || duration < 30) return false;
    const sessionKey = `ep_session_${tmdbID}_s${season}_e${episode}`;
    try {
      const now = Date.now();
      const progress = Math.min(1, Math.max(0, currentTime / duration));
      let existingProgress = 0;
      try {
        const progressData = this.getEpisodeProgress(tmdbID, season, episode);
        existingProgress = progressData.progress || 0;
      } catch {}

      // Get highest episode reached in this season
      let highestEpisode = this.getHighestWatched(tmdbID, season);

      // EXPLICIT RESTART DETECTION: Always allow currentTime = 0 (restart)
      if (currentTime === 0) {
        console.log(
          `[Continue Watching] Explicit restart detected for S${season}E${episode} - allowing restart`
        );
        // Clear session data for clean restart
        this.removeSessionData(sessionKey);

        // Update highest episode if this is a new episode
        if (episode > highestEpisode) {
          this.setHighestWatched(tmdbID, season, episode);
        }
        return true;
      }

      // Check for potential regression (user going back to earlier episode)
      // Only apply regression protection when currentTime > 0 and going backwards
      if (
        episode < highestEpisode &&
        progress < 0.9 &&
        progress < existingProgress
      ) {
        // User is watching an earlier episode with backwards progress
        // Check if this is a legitimate regression or accidental

        let sessionData = this.getSessionData(sessionKey);
        const REGRESSION_GRACE_PERIOD = 10 * 60 * 1000; // 10 minutes
        const MIN_WATCH_TIME = 2 * 60; // 2 minutes of actual watching

        if (!sessionData) {
          // First time watching this episode in this session
          sessionData = {
            startTime: now,
            totalWatchTime: 0,
            lastUpdate: now,
            initialProgress: existingProgress,
          };
        }

        // Update session watch time
        const timeSinceLastUpdate = Math.min(
          now - sessionData.lastUpdate,
          30000
        ); // Cap at 30s
        sessionData.totalWatchTime += timeSinceLastUpdate / 1000;
        sessionData.lastUpdate = now;

        // Only allow progress update if:
        // 1. User has been watching for a reasonable time, OR
        // 2. New progress is higher than existing, OR
        // 3. User has explicitly chosen to restart this episode
        const hasWatchedEnough = sessionData.totalWatchTime >= MIN_WATCH_TIME;
        const isProgressImprovement = progress > existingProgress;
        const isWithinGracePeriod =
          now - sessionData.startTime <= REGRESSION_GRACE_PERIOD;

        if (
          !hasWatchedEnough &&
          !isProgressImprovement &&
          isWithinGracePeriod
        ) {
          // Don't update progress yet, but save session data
          this.setSessionData(sessionKey, sessionData);
          console.log(
            `[Regression Protection] Blocking progress update for S${season}E${episode} - grace period active (current: ${currentTime}s, existing: ${(
              existingProgress * duration
            ).toFixed(1)}s)`
          );
          return false; // Block the save
        }
        // Update session data
        this.setSessionData(sessionKey, sessionData);
        console.log(
          `[Regression Protection] Allowing progress update for S${season}E${episode} - conditions met`
        );
      }

      // Save progress - allow all forward progress and restarts
      if (progress >= existingProgress || episode >= highestEpisode) {
        if (episode > highestEpisode) {
          this.setHighestWatched(tmdbID, season, episode);
        }
        if (progress >= 0.9) {
          this.removeSessionData(sessionKey);
          this.markEpisodeAsWatchedInPlaylist(tmdbID, season, episode);
        }
      }

      return true;
    } catch (error) {
      console.warn('Failed to save episode progress:', error);
      return true;
    }
  }

  // Optimized in-memory session cache helpers using Map
  private getSessionData(sessionKey: string): any {
    if (this.sessionCache.has(sessionKey)) {
      return this.sessionCache.get(sessionKey);
    }
    try {
      const sessionRaw = localStorage.getItem(sessionKey);
      if (sessionRaw) {
        const data = JSON.parse(sessionRaw);
        this.sessionCache.set(sessionKey, data);
        return data;
      }
    } catch {}
    return null;
  }

  private setSessionData(sessionKey: string, data: any): void {
    this.sessionCache.set(sessionKey, data);
    localStorage.setItem(sessionKey, JSON.stringify(data));
  }

  private removeSessionData(sessionKey: string): void {
    this.sessionCache.delete(sessionKey);
    localStorage.removeItem(sessionKey);
  }

  /**
   * Clean up old session data and expired grace periods
   * Call this periodically to prevent localStorage bloat
   */
  cleanupOldSessionData(): void {
    if (!this.isEnabled()) return;

    try {
      const now = Date.now();
      const MAX_SESSION_AGE = 24 * 60 * 60 * 1000; // 24 hours
      const keysToRemove: string[] = [];

      // Clean up old session tracking data
      for (let j = 0; j < localStorage.length; j++) {
        const key = localStorage.key(j);
        if (key && key.startsWith('ep_session_')) {
          try {
            const sessionData = JSON.parse(localStorage.getItem(key) || '{}');
            if (
              sessionData.lastUpdate &&
              now - sessionData.lastUpdate > MAX_SESSION_AGE
            ) {
              keysToRemove.push(key);
            }
          } catch {
            // Corrupted data, remove it
            keysToRemove.push(key);
          }
          // Remove from cache as well
          this.sessionCache.delete(key);
        }
      }

      // Clean up old pending data
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('cw_pending_')) {
          try {
            const pendingData = JSON.parse(localStorage.getItem(key) || '{}');
            if (
              pendingData.start &&
              now - pendingData.start > MAX_SESSION_AGE
            ) {
              keysToRemove.push(key);
            }
          } catch {
            // Corrupted data, remove it
            keysToRemove.push(key);
          }
        }
      }

      // Clean up old ep_progress_* keys (migration from old system)
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('ep_progress_')) {
          keysToRemove.push(key);
        }
      }

      // Remove identified keys
      keysToRemove.forEach((key) => localStorage.removeItem(key));

      if (keysToRemove.length > 0) {
        console.log(
          `Cleaned up ${keysToRemove.length} old session/progress data entries`
        );
      }
    } catch (error) {
      console.warn('Failed to cleanup old session data:', error);
    }
  }

  /**
   * Test method to verify regression protection is working
   * This can be called from browser console for testing
   */
  testRegressionProtection(tmdbID: string = 'test-123', season: number = 1) {
    console.log('🧪 Testing Regression Protection System');

    // Simulate watching episode 3 to completion
    console.log('📺 Simulating watching Episode 3 to completion...');
    this.saveOrAdvance({
      tmdbID,
      mediaType: 'tv',
      season,
      episode: 3,
      currentTime: 1800, // 30 minutes
      duration: 2000, // 33 minutes (90% = 1800s)
      poster_path: '/test.jpg',
      name: 'Test Series',
    });

    // Try to go back to episode 1 (should be blocked initially)
    console.log('⏪ Trying to go back to Episode 1 (should be blocked)...');
    const result1 = this.saveOrAdvance({
      tmdbID,
      mediaType: 'tv',
      season,
      episode: 1,
      currentTime: 300, // 5 minutes
      duration: 2000,
      poster_path: '/test.jpg',
      name: 'Test Series',
    });

    // Try again after some "watch time" (should still be blocked)
    setTimeout(() => {
      console.log(
        '⏪ Trying Episode 1 again after short time (should still be blocked)...'
      );
      this.saveOrAdvance({
        tmdbID,
        mediaType: 'tv',
        season,
        episode: 1,
        currentTime: 600, // 10 minutes
        duration: 2000,
        poster_path: '/test.jpg',
        name: 'Test Series',
      });
    }, 1000);

    console.log(
      '✅ Regression protection test initiated. Check console for protection messages.'
    );
    console.log(
      '🔍 To check stored data, run: Object.keys(localStorage).filter(k => k.includes("test-123"))'
    );
  }

  /**
   * Test method to verify the restart functionality works correctly
   * This can be called from browser console for testing
   */
  testRestartFunctionality(tmdbID: string = 'test-456', season: number = 1) {
    console.log('🧪 Testing Restart Functionality');

    // First, simulate watching episode 1 to 50% completion
    console.log('📺 Simulating watching Episode 1 to 50% completion...');
    this.saveOrAdvance({
      tmdbID,
      mediaType: 'tv',
      season,
      episode: 1,
      currentTime: 900, // 15 minutes
      duration: 1800, // 30 minutes total (50% = 900s)
      poster_path: '/test.jpg',
      name: 'Test Series',
    });

    let list = this.getList();
    let episode1Entry = list.find(
      (e) => e.tmdbID === tmdbID && e.episode === 1
    );
    console.log('Episode 1 after 50% watch:', episode1Entry);

    // Now try to restart episode 1 (currentTime = 0)
    console.log('🔄 Trying to restart Episode 1 (currentTime = 0)...');
    this.saveOrAdvance({
      tmdbID,
      mediaType: 'tv',
      season,
      episode: 1,
      currentTime: 0, // Restart from beginning
      duration: 1800,
      poster_path: '/test.jpg',
      name: 'Test Series',
    });

    list = this.getList();
    episode1Entry = list.find((e) => e.tmdbID === tmdbID && e.episode === 1);
    console.log('Episode 1 after restart attempt:', episode1Entry);

    // Test explicit restart method
    console.log('🔄 Testing explicit restart method...');
    this.restartEpisode(
      tmdbID,
      season,
      1,
      '/test.jpg',
      'Test Series',
      'Test Series'
    );

    list = this.getList();
    episode1Entry = list.find((e) => e.tmdbID === tmdbID && e.episode === 1);
    console.log('Episode 1 after explicit restart:', episode1Entry);

    if (episode1Entry && episode1Entry.currentTime === 0) {
      console.log('✅ Restart functionality working correctly!');
    } else {
      console.log('❌ Restart functionality failed!');
    }

    console.log(
      '🔍 To clean up test data, run: localStorage.removeItem("continueWatching")'
    );
  }

  // Helper methods for new cw_highest structure
  private getHighestWatched(tmdbID: string, season: number): number {
    try {
      const raw = localStorage.getItem('cw_highest');
      if (!raw) return 0;
      const obj = JSON.parse(raw);
      return obj?.[tmdbID]?.[season] || 0;
    } catch {
      return 0;
    }
  }

  private setHighestWatched(
    tmdbID: string,
    season: number,
    episode: number
  ): void {
    try {
      const raw = localStorage.getItem('cw_highest');
      const obj = raw ? JSON.parse(raw) : {};
      if (!obj[tmdbID]) obj[tmdbID] = {};
      obj[tmdbID][season] = episode;
      localStorage.setItem('cw_highest', JSON.stringify(obj));
    } catch {}
  }

  private removeHighestWatched(tmdbID: string, season: number): void {
    try {
      const raw = localStorage.getItem('cw_highest');
      if (!raw) return;
      const obj = JSON.parse(raw);
      if (obj[tmdbID]) {
        delete obj[tmdbID][season];
        if (Object.keys(obj[tmdbID]).length === 0) delete obj[tmdbID];
        localStorage.setItem('cw_highest', JSON.stringify(obj));
      }
    } catch {}
  }

  private removeAllHighestWatched(tmdbID: string): void {
    try {
      const raw = localStorage.getItem('cw_highest');
      if (!raw) return;
      const obj = JSON.parse(raw);
      if (obj[tmdbID]) {
        delete obj[tmdbID];
        localStorage.setItem('cw_highest', JSON.stringify(obj));
      }
    } catch {}
  }

  /**
   * Remove all session/progress data for previous episodes in a season
   */
  private cleanupOldEpisodeData(
    tmdbID: string,
    season: number,
    currentEpisode: number
  ): void {
    const keysToRemove: string[] = [];
    for (let i = 1; i < currentEpisode; i++) {
      const sessionKey = `ep_session_${tmdbID}_s${season}_e${i}`;
      const progressKey = `ep_progress_${tmdbID}_s${season}_e${i}`;
      keysToRemove.push(sessionKey, progressKey);
    }
    keysToRemove.forEach((key) => {
      this.removeSessionData(key);
      localStorage.removeItem(key);
    });
  }

  /**
   * Explicitly restart an episode from the beginning (currentTime = 0)
   * This bypasses regression protection and clears any existing progress
   * @param tmdbID The TMDB ID of the show
   * @param season The season number
   * @param episode The episode number
   * @param poster_path Optional poster path
   * @param title Optional title
   * @param name Optional name
   */
  restartEpisode(
    tmdbID: string,
    season: number,
    episode: number,
    poster_path?: string,
    title?: string,
    name?: string
  ): void {
    if (!this.isEnabled()) return;

    console.log(
      `[Continue Watching] Explicitly restarting S${season}E${episode}`
    );

    // Create a restart entry with currentTime = 0
    const restartEntry: ContinueWatchingEntry = {
      tmdbID,
      mediaType: 'tv',
      season,
      episode,
      currentTime: 0,
      duration: 0, // Will be updated when the player loads
      poster_path,
      title,
      name,
    };

    // Remove any existing entry for this episode
    let list = this.getList();
    list = list.filter(
      (e) =>
        !(
          e.tmdbID === tmdbID &&
          e.mediaType === 'tv' &&
          e.season === season &&
          e.episode === episode
        )
    );

    // Add the restart entry at the beginning
    list.unshift(restartEntry);

    // Clean up session data for fresh start
    const sessionKey = `ep_session_${tmdbID}_s${season}_e${episode}`;
    this.removeSessionData(sessionKey);

    // Don't mark as unwatched in playlist - user might want to restart a watched episode

    this.saveList(list);
  }

  /**
   * Check if a specific episode is currently in the continue watching list
   * @param tmdbID The TMDB ID of the show
   * @param season The season number
   * @param episode The episode number
   * @returns boolean indicating if the episode is in continue watching
   */
  isInContinueWatching(
    tmdbID: string,
    season: number,
    episode: number
  ): boolean {
    if (!this.isEnabled()) return false;

    try {
      const list = this.getList();
      return list.some(
        (entry) =>
          entry.tmdbID === tmdbID &&
          entry.mediaType === 'tv' &&
          entry.season === season &&
          entry.episode === episode
      );
    } catch {
      return false;
    }
  }

  /**
   * Debug method to help troubleshoot continue watching issues
   * Can be called from browser console: continuewatchingService.debugContinueWatching()
   */
  debugContinueWatching(): void {
    console.log('🔍 Continue Watching Debug Info:');
    console.log('Service enabled:', this.isEnabled());

    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) {
        console.log('No continue watching data found in localStorage');
        return;
      }

      const parsed = JSON.parse(raw);
      console.log('Raw localStorage data:', parsed);
      console.log('Filtered data from getList():', this.getList());
      console.log('Memory cache:', this.memoryCache);
      console.log('Cache timestamp:', new Date(this.cacheTimestamp));

      // Analyze each entry
      if (Array.isArray(parsed)) {
        parsed.forEach((entry: ContinueWatchingEntry, index: number) => {
          console.log(`Entry ${index}:`, {
            tmdbID: entry.tmdbID,
            mediaType: entry.mediaType,
            currentTime: entry.currentTime,
            duration: entry.duration,
            progress: entry.duration
              ? ((entry.currentTime / entry.duration) * 100).toFixed(1) + '%'
              : 'N/A',
            shouldRemove: this.shouldRemove(entry),
            title: entry.title || entry.name,
          });
        });
      }
    } catch (error) {
      console.error('Error debugging continue watching:', error);
    }
  }
}
