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
      // Filter and advance logic
      parsed = parsed.filter((entry: ContinueWatchingEntry) => {
        if (!entry.duration) return true;
        if (entry.currentTime >= entry.duration) {
          // If TV, advance to next episode if possible (assume totalEpisodesInSeason unknown here)
          if (entry.mediaType === 'tv' && entry.episode) {
            // Advance to next episode, reset currentTime
            entry.episode += 1;
            entry.currentTime = 0;
            // duration will be updated by the player on next watch
            return true;
          }
          // If movie, remove from list
          return false;
        }
        return true;
      });
      return parsed;
    } catch {
      localStorage.removeItem(this.key);
      return [];
    }
  }  /**
   * Save or update the continue watching entry.
   * For TV: If finished, advance to next episode.
   * For Movie: If finished, remove from list.
   *
   * Foolproof: Prevent accidental overwrite if user goes back to a lower episode.
   */
  saveOrAdvance(entry: ContinueWatchingEntry, totalEpisodesInSeason?: number, totalSeasons?: number) {
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
      if (originalEpisode && highestWatched > originalEpisode && entry.currentTime < entry.duration * 0.9) {
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
      if (entry.mediaType === 'tv' && entry.episode && totalEpisodesInSeason) {
        if (entry.episode < totalEpisodesInSeason) {
          // Advance to next episode in same season, keep in continue watching
          const nextEntry: ContinueWatchingEntry = {
            ...entry,
            episode: entry.episode + 1,
            currentTime: 0,
            // duration will be updated by the player on next watch
          };
          list.unshift(nextEntry);        } else {
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
   * Check if a specific episode has been watched (completed)
   * @param tmdbID The TMDB ID of the show
   * @param season The season number
   * @param episode The episode number
   * @returns boolean indicating if the episode has been watched
   */
  isEpisodeWatched(tmdbID: string, season: number, episode: number): boolean {
    if (!this.isEnabled()) return false;
    
    try {
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
        e => e.tmdbID === tmdbID && 
             e.mediaType === 'tv' && 
             e.season === season && 
             e.episode === episode
      );
      
      // If the entry exists and currentTime is at least 90% of duration, consider it watched
      if (entry && entry.currentTime >= entry.duration * 0.9) {
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
      // Get highest watched episode from localStorage
      const highestKey = `cw_highest_${tmdbID}_s${season}`;
      const highestWatched = Number(localStorage.getItem(highestKey)) || 0;
      
      // All episodes up to highest watched are considered watched
      const watchedEpisodes: number[] = [];
      for (let i = 1; i < highestWatched; i++) {
        watchedEpisodes.push(i);
      }
      
      // Check current continue watching list for additional watched episodes
      const cwList = this.getList();
      cwList.forEach(entry => {
        if (entry.tmdbID === tmdbID && 
            entry.mediaType === 'tv' && 
            entry.season === season && 
            typeof entry.episode === 'number' &&
            entry.currentTime >= entry.duration * 0.9 &&
            !watchedEpisodes.includes(entry.episode)) {
          watchedEpisodes.push(entry.episode);
        }
      });
      
      return watchedEpisodes;
    } catch {
      return [];
    }
  }
}
