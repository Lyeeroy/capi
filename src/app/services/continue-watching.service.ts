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

  getList(): ContinueWatchingEntry[] {
    if (!this.isEnabled()) return [];
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return [];
      let parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error('Corrupted');

      // Only filter out completed movies, don't auto-advance TV episodes here
      // Auto-advancement should only happen during explicit progress saving
      parsed = parsed.filter((entry: ContinueWatchingEntry) => {
        if (!entry.duration) return true;
        if (entry.currentTime >= entry.duration) {
          // For movies, remove from list when completed
          if (entry.mediaType === 'movie') {
            return false;
          }
          // For TV shows, keep the entry but don't auto-advance here
          // Auto-advancement will happen in saveOrAdvance method
          return true;
        }
        return true;
      });
      return parsed;
    } catch {
      localStorage.removeItem(this.key);
      return [];
    }
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
    let list = this.getList();

    // Store the original episode number before any potential changes
    const originalEpisode = entry.episode;

    // Remove all entries for this series/movie (not just episode)
    list = list.filter(
      (e) => !(e.tmdbID === entry.tmdbID && e.mediaType === entry.mediaType)
    );

    // --- Foolproof logic for TV shows ---
    if (entry.mediaType === 'tv' && entry.episode) {
      const highestKey = `cw_highest_${entry.tmdbID}_s${entry.season}`;
      const pendingKey = `cw_pending_${entry.tmdbID}_s${entry.season}`;
      let highestWatched = 0;
      try {
        highestWatched = Number(localStorage.getItem(highestKey)) || 0;
      } catch {}

      // Check if user has already progressed to next episode via another mechanism
      // (This prevents overwriting with older episode data)
      if (
        originalEpisode &&
        highestWatched > originalEpisode &&
        entry.currentTime < entry.duration * 0.9
      ) {
        return; // Don't save if user has already moved to a higher episode and this entry isn't nearly complete
      }

      // If user is going back to a lower episode
      if (entry.episode < highestWatched) {
        // Check if grace period is active
        let pending = null;
        try {
          pending = JSON.parse(localStorage.getItem(pendingKey) || 'null');
        } catch {}
        const now = Date.now();
        const GRACE_PERIOD_MS = 3 * 60 * 1000; // 3 minutes
        const watchedEnough = entry.currentTime > 0.5 * (entry.duration || 1);
        if (!pending || pending.episode !== entry.episode) {
          // Start new grace period
          localStorage.setItem(
            pendingKey,
            JSON.stringify({ episode: entry.episode, start: now })
          );
          // Do NOT overwrite yet
          return;
        } else if (now - pending.start < GRACE_PERIOD_MS && !watchedEnough) {
          // Still in grace period and not watched enough
          return;
        }
        // If grace period passed or watched enough, allow overwrite
        localStorage.removeItem(pendingKey);
      } else if (entry.episode > highestWatched) {
        // Update highest episode reached
        try {
          localStorage.setItem(highestKey, String(entry.episode));
        } catch {}
      }
    }
    // --- End foolproof logic ---

    const shouldRemoveNow = this.shouldRemove(entry);
    if (shouldRemoveNow) {
      // Mark the completed episode as watched in playlist system
      if (entry.mediaType === 'tv' && entry.episode && entry.season) {
        this.markEpisodeAsWatchedInPlaylist(
          entry.tmdbID,
          entry.season,
          entry.episode
        );
      }

      if (entry.mediaType === 'tv' && entry.episode && totalEpisodesInSeason) {
        if (entry.episode < totalEpisodesInSeason) {
          // Advance to next episode in same season, keep in continue watching
          const nextEntry: ContinueWatchingEntry = {
            ...entry,
            episode: entry.episode + 1,
            currentTime: 0,
            // duration will be updated by the player on next watch
          };
          list.unshift(nextEntry);
        } else {
          // Last episode of season - check if there's a next season
          if (totalSeasons && entry.season && entry.season < totalSeasons) {
            // Advance to next season's first episode
            const nextSeasonEntry: ContinueWatchingEntry = {
              ...entry,
              season: entry.season + 1,
              episode: 1,
              currentTime: 0,
              // duration will be updated by the player on next watch
            };
            list.unshift(nextSeasonEntry);
          }
          // If no next season or season info not available, remove from continue watching
        }
      }
      // If last episode or movie finished, do not add anything (removes from continue watching)
    } else {
      // Not finished, just update/add entry
      list.unshift(entry);
    }
    // Limit size
    if (list.length > this.maxEntries) list = list.slice(0, this.maxEntries);
    localStorage.setItem(this.key, JSON.stringify(list));
  }

  shouldRemove(entry: ContinueWatchingEntry): boolean {
    // Use 900s for TV, 4200s for movies
    const minDuration = entry.mediaType === 'tv' ? 900 : 4200;
    if (!entry.duration || entry.duration < minDuration) return false;
    // Only check if currentTime >= duration (hardcoded time)
    return entry.currentTime >= entry.duration;
  }

  removeEntry(index: number) {
    if (!this.isEnabled()) return;
    const list = this.getList();
    const entry = list[index];
    if (entry && entry.tmdbID) {
      try {
        localStorage.removeItem(`playlist_last_played_${entry.tmdbID}`);
      } catch (e) {
        // Optionally log error or ignore
      }
    }
    list.splice(index, 1);
    localStorage.setItem(this.key, JSON.stringify(list));
  }

  remove(tmdbID: string, mediaType: string) {
    if (!this.isEnabled()) return;
    // Remove from continue watching list
    let list = this.getList();
    list = list.filter(
      (e) => !(e.tmdbID === tmdbID && e.mediaType === mediaType)
    );
    localStorage.setItem(this.key, JSON.stringify(list));

    // Also remove playlist_last_played_{tmdbID} from localStorage
    try {
      localStorage.removeItem(`playlist_last_played_${tmdbID}`);
    } catch (e) {
      // Optionally log error or ignore
    }
  }

  clearAll() {
    if (!this.isEnabled()) return;
    localStorage.removeItem(this.key);
  }

  overwriteList(newList: ContinueWatchingEntry[]) {
    if (!this.isEnabled()) return;
    localStorage.setItem(this.key, JSON.stringify(newList));
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
      const highestKey = `cw_highest_${tmdbID}_s${season}`;
      const highestWatched = Number(localStorage.getItem(highestKey)) || 0;

      // If we've watched a higher episode, this one must be completed
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

      // If the entry exists and currentTime is at least 90% of duration, consider it watched
      if (
        entry &&
        entry.duration > 0 &&
        entry.currentTime >= entry.duration * 0.9
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
      const highestKey = `cw_highest_${tmdbID}_s${season}`;
      const highestWatched = Number(localStorage.getItem(highestKey)) || 0;

      // All episodes up to highest watched are considered watched
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
          entry.currentTime >= entry.duration * 0.9 &&
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
    const highestKey = `cw_highest_${tmdbID}_s${season}`;
    const highestWatched = Number(localStorage.getItem(highestKey)) || 0;

    // If this episode is lower than the highest watched, mark it as watched in playlist
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
        entry.currentTime >= entry.duration * 0.9
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

                  // Update the highest watched episode tracker
                  const highestKey = `cw_highest_${tmdbID}_s${season}`;
                  const currentHighest =
                    Number(localStorage.getItem(highestKey)) || 0;

                  if (episode > currentHighest) {
                    localStorage.setItem(highestKey, String(episode));
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
      console.error('Error during cleanup and synchronization:', error);
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
  getEpisodeProgress(tmdbID: string, season: number, episode: number): {
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
        const progress = Math.min(1, Math.max(0, entry.currentTime / entry.duration));
        return {
          currentTime: entry.currentTime,
          duration: entry.duration,
          progress: progress
        };
      }

      // If not in continue watching, check if episode is marked as watched
      if (this.isEpisodeWatched(tmdbID, season, episode)) {
        // Return full progress for watched episodes
        return {
          currentTime: 0, // We don't store the exact time for completed episodes
          duration: 0,
          progress: 1
        };
      }

      return defaultResult;
    } catch {
      return defaultResult;
    }
  }

  /**
   * Remove episode progress and mark as unwatched
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
        (e) => !(
          e.tmdbID === tmdbID &&
          e.mediaType === 'tv' &&
          e.season === season &&
          e.episode === episode
        )
      );
      localStorage.setItem(this.key, JSON.stringify(cwList));

      // Remove from watched episodes
      const watchedKey = `watched_episodes_${tmdbID}`;
      const episodeKey = `s${season}e${episode}`;
      const watchedData = localStorage.getItem(watchedKey);

      if (watchedData) {
        const watchedArray = JSON.parse(watchedData);
        const watchedSet = new Set(watchedArray);
        watchedSet.delete(episodeKey);
        
        if (watchedSet.size > 0) {
          localStorage.setItem(watchedKey, JSON.stringify(Array.from(watchedSet)));
        } else {
          localStorage.removeItem(watchedKey);
        }
      }

      // Update highest watched episode tracker if necessary
      const highestKey = `cw_highest_${tmdbID}_s${season}`;
      const currentHighest = Number(localStorage.getItem(highestKey)) || 0;
      
      // If removing the highest episode, find the new highest
      if (episode === currentHighest) {
        const remainingWatchedData = localStorage.getItem(watchedKey);
        let newHighest = 0;
        
        if (remainingWatchedData) {
          const remainingWatched = JSON.parse(remainingWatchedData);
          for (const episodeKey of remainingWatched) {
            const match = episodeKey.match(/^s(\d+)e(\d+)$/);
            if (match && parseInt(match[1]) === season) {
              const episodeNum = parseInt(match[2]);
              if (episodeNum > newHighest) {
                newHighest = episodeNum;
              }
            }
          }
        }
        
        if (newHighest > 0) {
          localStorage.setItem(highestKey, String(newHighest));
        } else {
          localStorage.removeItem(highestKey);
        }
      }
    } catch (error) {
      console.error('Error removing episode progress:', error);
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

      // Remove all season highest trackers
      const keys = Object.keys(localStorage);
      const highestKeys = keys.filter(key => key.startsWith(`cw_highest_${tmdbID}_s`));
      highestKeys.forEach(key => localStorage.removeItem(key));

      // Remove pending keys
      const pendingKeys = keys.filter(key => key.startsWith(`cw_pending_${tmdbID}_s`));
      pendingKeys.forEach(key => localStorage.removeItem(key));

    } catch (error) {
      console.error('Error removing all watched episodes:', error);
    }
  }
}
