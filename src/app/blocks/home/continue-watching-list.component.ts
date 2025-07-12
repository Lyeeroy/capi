import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import {
  ContinueWatchingService,
  ContinueWatchingEntry,
} from '../../services/continue-watching.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-continue-watching-list',
  templateUrl: './continue-watching-list.component.html',
  standalone: true,
  imports: [CommonModule],
})
export class ContinueWatchingListComponent implements OnInit, OnDestroy {
  list: ContinueWatchingEntry[] = [];
  number = 0;
  private refreshInterval: any;
  private filterCache: ContinueWatchingEntry[] | null = null;
  private cacheTimestamp = 0;
  private readonly CACHE_TTL = 5000; // 5 seconds cache

  constructor(
    private continueWatchingService: ContinueWatchingService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadList();
    // Optimized refresh - only every 30 seconds instead of 10
    this.refreshInterval = setInterval(() => {
      this.loadList();
    }, 30000);
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  loadList() {
    const now = Date.now();

    // Use cached result if still valid
    if (this.filterCache && now - this.cacheTimestamp < this.CACHE_TTL) {
      this.list = this.filterCache;
      return;
    }

    // Optimized filtering with early returns
    const rawList = this.continueWatchingService.getList();
    this.list = rawList.filter(this.shouldIncludeEntry);

    // Cache the result
    this.filterCache = this.list;
    this.cacheTimestamp = now;
  }

  private shouldIncludeEntry = (entry: ContinueWatchingEntry): boolean => {
    // Always include entries that are just starting (no duration set yet)
    if (!entry.duration || entry.duration === 0) {
      return true;
    }

    // Include entries that haven't been completed yet
    if (entry.currentTime < entry.duration) {
      // For TV shows, check minimum duration (15 minutes)
      if (entry.mediaType === 'tv') {
        return entry.duration >= 900;
      }
      // For movies, use a lower minimum threshold (30 minutes)
      if (entry.mediaType === 'movie') {
        return entry.duration >= 1800;
      }
    }

    // Include restart scenarios (currentTime = 0 but duration is set)
    return entry.currentTime === 0 && entry.duration > 0;
  };

  resume(entry: ContinueWatchingEntry) {
    // Mark episode as accessed when navigating via continue watching
    if (entry.mediaType === 'tv' && entry.season && entry.episode) {
      this.continueWatchingService.markEpisodeAsAccessed(
        entry.tmdbID,
        entry.season,
        entry.episode
      );
    }

    const queryParams: any = {};
    if (entry.mediaType === 'tv') {
      queryParams.season = entry.season;
      queryParams.episode = entry.episode;
    }
    this.router.navigate(['/player', entry.tmdbID, entry.mediaType], {
      queryParams,
    });
  }

  remove(index: number) {
    this.continueWatchingService.removeEntry(index);
    this.invalidateCache();
    this.loadList();
  }

  clearAll() {
    this.continueWatchingService.clearAll();
    this.invalidateCache();
    this.loadList();
  }

  private invalidateCache(): void {
    this.filterCache = null;
    this.cacheTimestamp = 0;
  }
}
