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

  getList(): ContinueWatchingEntry[] {
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
    let list = this.getList();
    // Remove all entries for this series/movie
    list = list.filter(
      (e) => !(e.tmdbID === entry.tmdbID && e.mediaType === entry.mediaType)
    );

    // If finished (>= 70%), advance or remove
    if (this.shouldRemove(entry)) {
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
    if (!entry.duration || entry.duration < 60) return false;
    const percent = entry.currentTime / entry.duration;
    return percent >= 0.7 || entry.currentTime >= entry.duration;
  }

  removeEntry(index: number) {
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
    localStorage.removeItem(this.key);
  }

  overwriteList(newList: ContinueWatchingEntry[]) {
    localStorage.setItem(this.key, JSON.stringify(newList));
  }
}
