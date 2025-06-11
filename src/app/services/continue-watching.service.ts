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
   */
  saveOrAdvance(entry: ContinueWatchingEntry, totalEpisodesInSeason?: number) {
    if (!this.isEnabled()) return;
    let list = this.getList();
    // Find previous entry for this series/movie/episode
    const prevEntry = list.find(
      (e) =>
        e.tmdbID === entry.tmdbID &&
        e.mediaType === entry.mediaType &&
        (entry.mediaType !== 'tv' ||
          (e.season === entry.season && e.episode === entry.episode))
    );
    // Remove all entries for this series/movie/episode
    list = list.filter(
      (e) =>
        !(
          e.tmdbID === entry.tmdbID &&
          e.mediaType === entry.mediaType &&
          (entry.mediaType !== 'tv' ||
            (e.season === entry.season && e.episode === entry.episode))
        )
    );

    // Only remove/advance if currentTime increased and threshold met
    const shouldRemoveNow =
      this.shouldRemove(entry) &&
      (!prevEntry || entry.currentTime > prevEntry.currentTime);

    if (shouldRemoveNow) {
      if (entry.mediaType === 'tv' && entry.episode && totalEpisodesInSeason) {
        // If not last episode, advance to next episode
        if (entry.episode < totalEpisodesInSeason) {
          const nextEntry: ContinueWatchingEntry = {
            ...entry,
            episode: entry.episode + 1,
            currentTime: 0,
            duration: entry.duration,
          };
          list.unshift(nextEntry);
        }
        // If last episode, do not add (series finished)
      }
      // For movies, do not add (movie finished)
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
