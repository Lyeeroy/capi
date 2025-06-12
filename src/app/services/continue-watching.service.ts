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
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error('Corrupted');
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
  saveOrAdvance(entry: ContinueWatchingEntry, totalEpisodesInSeason?: number) {
    if (!this.isEnabled()) return;
    let list = this.getList();
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
      if (
        entry.mediaType === 'tv' &&
        entry.episode &&
        totalEpisodesInSeason &&
        entry.episode < totalEpisodesInSeason
      ) {
        // Advance to next episode, keep in continue watching
        const nextEntry: ContinueWatchingEntry = {
          ...entry,
          episode: entry.episode + 1,
          currentTime: 0,
          // duration will be updated by the player on next watch
        };
        list.unshift(nextEntry);
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
}
