import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  WatchlistService,
  WatchlistItem,
} from '../../services/watchlist.service';
import { IconLibComponent } from '../../svg-icons/icon-lib.component';

@Component({
  selector: 'app-watchlist',
  standalone: true,
  imports: [CommonModule, IconLibComponent],
  templateUrl: './watchlist.component.html',
  styleUrls: ['./watchlist.component.css'],
})
export class WatchlistComponent implements OnInit {
  watchlist: WatchlistItem[] = [];
  filteredWatchlist: WatchlistItem[] = [];
  currentFilter: 'all' | 'movie' | 'tv' = 'all';
  isLoading = true;

  constructor(
    private watchlistService: WatchlistService,
    public router: Router
  ) {}

  get isWatchlistEnabled(): boolean {
    return this.watchlistService.isEnabled();
  }

  ngOnInit() {
    if (!this.watchlistService.isEnabled()) {
      // If watchlist is disabled, redirect to home or show disabled message
      this.isLoading = false;
      return;
    }
    this.loadWatchlist();
  }

  loadWatchlist() {
    this.isLoading = true;
    try {
      this.watchlist = this.watchlistService.getWatchlist();
      this.applyFilter();
    } catch (error) {
      console.error('Error loading watchlist:', error);
    } finally {
      this.isLoading = false;
    }
  }

  applyFilter() {
    if (this.currentFilter === 'all') {
      this.filteredWatchlist = this.watchlist;
    } else {
      this.filteredWatchlist = this.watchlist.filter(
        (item) => item.mediaType === this.currentFilter
      );
    }
  }

  onFilterChange(filter: 'all' | 'movie' | 'tv') {
    this.currentFilter = filter;
    this.applyFilter();
  }

  removeFromWatchlist(item: WatchlistItem, event: Event) {
    event.stopPropagation();

    const success = this.watchlistService.removeFromWatchlist(
      item.tmdbID,
      item.mediaType
    );
    if (success) {
      this.loadWatchlist(); // Reload to update the list
    }
  }

  navigateToPlayer(item: WatchlistItem) {
    this.router.navigate(['/player', item.tmdbID, item.mediaType]);
  }

  clearAllWatchlist() {
    if (
      confirm(
        'Are you sure you want to clear your entire watchlist? This cannot be undone.'
      )
    ) {
      this.watchlistService.clearWatchlist();
      this.loadWatchlist();
    }
  }

  getDisplayTitle(item: WatchlistItem): string {
    return item.title || item.name || 'Unknown Title';
  }

  getYear(item: WatchlistItem): string {
    const date = item.release_date || item.first_air_date;
    if (date) {
      return new Date(date).getFullYear().toString();
    }
    return '';
  }

  getRating(item: WatchlistItem): string {
    if (item.vote_average && item.vote_average > 0) {
      return item.vote_average.toFixed(1);
    }
    return '';
  }

  getPosterUrl(item: WatchlistItem): string {
    if (item.poster_path) {
      return `https://image.tmdb.org/t/p/w500${item.poster_path}`;
    }
    return './assets/placeholder.png';
  }

  getFilterCount(filter: 'all' | 'movie' | 'tv'): number {
    if (filter === 'all') {
      return this.watchlist.length;
    }
    return this.watchlist.filter((item) => item.mediaType === filter).length;
  }

  trackByFn(index: number, item: WatchlistItem): string {
    return `${item.tmdbID}_${item.mediaType}`;
  }
}
