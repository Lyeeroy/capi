import { Injectable } from '@angular/core';

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
  private readonly CACHE_TTL = 10000; // 10 seconds
  private readonly PROGRESS_THRESHOLD = 0.9;
  private readonly TV_MIN_DURATION = 900;
  private readonly MOVIE_MIN_DURATION = 4200;

  private sessionCache: { [key: string]: any } = {};

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
   * Get the continue watching list, using in-memory cache for speed.
   */
  getList(): ContinueWatchingEntry[] {
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
      parsed = parsed.filter((entry: ContinueWatchingEntry) => {
        if (!entry.duration) return true;
        if (entry.currentTime >= entry.duration) {
          if (entry.mediaType === 'movie') {
            return false;
          }
          return true;
        }
        return true;
      });
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
   * Save the continue watching list to localStorage and update cache.
   */
  private saveList(list: ContinueWatchingEntry[]): void {
    this.memoryCache = list;
    this.cacheTimestamp = Date.now();
    localStorage.setItem(this.key, JSON.stringify(list));
  }

  /**
   * Remove all entries for a given tmdbID and mediaType.
   */
  private filterOutEntry(
    list: ContinueWatchingEntry[],
    tmdbID: string,
    mediaType: string
  ): ContinueWatchingEntry[] {
    return list.filter(
      (e) => !(e.tmdbID === tmdbID && e.mediaType === mediaType)
    );
  }

  /**
   * Save or update the continue watching entry.
   * For TV: If finished, advance to next episode.
   * For Movie: If finished, remove from list.
   *
   * Foolproof: Prevent accidental overwrite if user goes back to a lower episode.
   */
  saveOrAdvance(
    entry: ContinueWatchingEntry,
    totalEpisodesInSeason?: number,
    totalSeasons?: number
  ) {
    if (!this.isEnabled()) return;
    // Clean up old episode data for previous episodes in this season
    if (entry.mediaType === 'tv' && entry.episode && entry.season) {
      this.cleanupOldEpisodeData(entry.tmdbID, entry.season, entry.episode);
    }
    let list = this.getList();
    list = this.filterOutEntry(list, entry.tmdbID, entry.mediaType);
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
        console.log(
          `[Continue Watching] Blocked progress save for ${entry.tmdbID} S${entry.season}E${entry.episode} due to regression protection`
        );
        return;
      }
    }
    const shouldRemoveNow = this.shouldRemove(entry);
    if (shouldRemoveNow) {
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
      list.unshift(entry);
    }
    if (list.length > this.maxEntries) list = list.slice(0, this.maxEntries);
    this.saveList(list);
  }

  shouldRemove(entry: ContinueWatchingEntry): boolean {
    const minDuration =
      entry.mediaType === 'tv' ? this.TV_MIN_DURATION : this.MOVIE_MIN_DURATION;
    if (!entry.duration || entry.duration < minDuration) return false;
    return entry.currentTime >= entry.duration;
  }

  removeEntry(index: number) {
    if (!this.isEnabled()) return;
    let list = this.getList();
    list.splice(index, 1);
    this.saveList(list);
  }

  remove(tmdbID: string, mediaType: string) {
    if (!this.isEnabled()) return;
    let list = this.getList();
    list = this.filterOutEntry(list, tmdbID, mediaType);
    this.saveList(list);
  }

  clearAll() {
    if (!this.isEnabled()) return;
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

      // Check for potential regression (user going back to earlier episode)
      if (episode < highestEpisode && progress < 0.9) {
        // User is watching an earlier episode and hasn't nearly finished it
        // Check if this is a legitimate regression or accidental

        let sessionData = this.getSessionData(sessionKey);
        const REGRESSION_GRACE_PERIOD = 10 * 60 * 1000; // 10 minutes
        const MIN_WATCH_TIME = 2 * 60; // 2 minutes of actual watching (reduced from 5 minutes)

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
            `[Regression Protection] Blocking progress update for S${season}E${episode} - grace period active`
          );
          return false; // Block the save
        }
        // Update session data
        this.setSessionData(sessionKey, sessionData);
        console.log(
          `[Regression Protection] Allowing progress update for S${season}E${episode} - conditions met`
        );
      }

      // Save progress only if it's an improvement or user has committed to watching
      if (progress > existingProgress || episode >= highestEpisode) {
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

  // In-memory session cache helpers
  private getSessionData(sessionKey: string): any {
    if (this.sessionCache[sessionKey]) {
      return this.sessionCache[sessionKey];
    }
    try {
      const sessionRaw = localStorage.getItem(sessionKey);
      if (sessionRaw) {
        const data = JSON.parse(sessionRaw);
        this.sessionCache[sessionKey] = data;
        return data;
      }
    } catch {}
    return null;
  }

  private setSessionData(sessionKey: string, data: any): void {
    this.sessionCache[sessionKey] = data;
    localStorage.setItem(sessionKey, JSON.stringify(data));
  }

  private removeSessionData(sessionKey: string): void {
    delete this.sessionCache[sessionKey];
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
          delete this.sessionCache[key];
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
}
