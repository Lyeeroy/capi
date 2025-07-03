import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WatchlistService } from '../../services/watchlist.service';
import { IconLibComponent } from '../../svg-icons/icon-lib.component';

@Component({
  selector: 'app-watchlist-button-old',
  standalone: true,
  imports: [CommonModule, IconLibComponent],
  template: `
    <button
      type="button"
      (click)="toggleWatchlist($event)"
      [title]="isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'"
      [ngClass]="buttonClass + ' px-4 py-1.5'"
    >
      <app-icon-lib
        [ico]="isInWatchlist ? 'bookmarks' : 'bookmarks'"
        [ngClass]="
          isInWatchlist ? 'text-blue-600 dark:text-blue-400' : 'text-white'
        "
        class="w-5 h-5 mx-auto my-auto"
      ></app-icon-lib>
    </button>
  `,
})
export class WatchlistButtonOldComponent implements OnInit {
  @Input() tmdbID!: string;
  @Input() mediaType!: 'movie' | 'tv';
  @Input() title?: string;
  @Input() name?: string;
  @Input() poster_path?: string;
  @Input() overview?: string;
  @Input() release_date?: string;
  @Input() first_air_date?: string;
  @Input() vote_average?: number;
  @Input() genre_ids?: number[];

  @Input() customClass: string = '';

  isInWatchlist = false;

  constructor(private watchlistService: WatchlistService) {}

  ngOnInit() {
    this.checkWatchlistStatus();
  }

  private checkWatchlistStatus() {
    this.isInWatchlist = this.watchlistService.isInWatchlist(
      this.tmdbID,
      this.mediaType
    );
  }

  toggleWatchlist(event: Event) {
    event.stopPropagation();
    event.preventDefault();

    if (this.isInWatchlist) {
      const success = this.watchlistService.removeFromWatchlist(
        this.tmdbID,
        this.mediaType
      );
      if (success) {
        this.isInWatchlist = false;
      }
    } else {
      const success = this.watchlistService.addToWatchlist({
        tmdbID: this.tmdbID,
        mediaType: this.mediaType,
        title: this.title,
        name: this.name,
        poster_path: this.poster_path,
        overview: this.overview,
        release_date: this.release_date,
        first_air_date: this.first_air_date,
        vote_average: this.vote_average,
        genre_ids: this.genre_ids,
      });
      if (success) {
        this.isInWatchlist = true;
      }
    }
  }

  get buttonClass() {
    return [
      'flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
      this.isInWatchlist
        ? 'bg-blue-500 hover:bg-blue-600 text-white'
        : 'bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-600 dark:text-gray-400',
      this.customClass,
    ].join(' ');
  }
}
