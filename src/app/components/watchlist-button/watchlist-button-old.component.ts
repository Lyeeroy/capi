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
      [ngClass]="getButtonClasses()"
      class="btn"
    >
      <app-icon-lib
        [ico]="isInWatchlist ? 'check' : 'plus'"
        class="btn-icon"
      ></app-icon-lib>
      <span class="btn-text">{{ isInWatchlist ? 'Added' : 'Watchlist' }}</span>
    </button>
  `,
  styles: [
    `
      /* Material Design 3 Button Base */
      .btn {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        height: 36px;
        padding: 0 1rem;
        border-radius: 0.75rem; /* rounded-xl = 12px */
        font-size: 0.875rem;
        font-weight: 500;
        letter-spacing: 0.01em;
        cursor: pointer;
        transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
        border: none;
        outline: none;
        text-decoration: none;
        white-space: nowrap;
        user-select: none;
        overflow: hidden;
      }

      @media (min-width: 640px) {
        .btn {
          height: 40px;
          padding: 0 1.25rem;
          font-size: 0.9375rem;
        }
      }

      @media (min-width: 768px) {
        .btn {
          height: 44px;
          padding: 0 1.5rem;
          font-size: 1rem;
        }
      }

      /* Ripple effect */
      .btn::before {
        content: '';
        position: absolute;
        inset: 0;
        background: currentColor;
        opacity: 0;
        transition: opacity 250ms cubic-bezier(0.4, 0, 0.2, 1);
        border-radius: inherit;
      }

      .btn:hover::before {
        opacity: 0.08;
      }

      .btn:active::before {
        opacity: 0.12;
      }

      .btn:focus-visible {
        outline: 2px solid rgba(255, 255, 255, 0.5);
        outline-offset: 2px;
      }

      /* Filled Button - When in watchlist */
      .btn-filled {
        background: #fff;
        color: #1a1a1a;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2);
      }

      .btn-filled:hover {
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35), 0 1px 3px rgba(0, 0, 0, 0.25);
        transform: translateY(-1px);
      }

      .btn-filled:active {
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 0 1px rgba(0, 0, 0, 0.2);
        transform: translateY(0);
      }

      /* Outlined Button - When not in watchlist */
      .btn-outlined {
        background: rgba(255, 255, 255, 0.08);
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
      }

      .btn-outlined:hover {
        background: rgba(255, 255, 255, 0.12);
        border-color: rgba(255, 255, 255, 0.3);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);
        transform: translateY(-1px);
      }

      .btn-outlined:active {
        background: rgba(255, 255, 255, 0.16);
        transform: translateY(0);
      }

      /* Icon sizing */
      .btn-icon {
        width: 1.125rem;
        height: 1.125rem;
        flex-shrink: 0;
      }

      @media (min-width: 768px) {
        .btn-icon {
          width: 1.25rem;
          height: 1.25rem;
        }
      }

      /* Text visibility */
      .btn-text {
        display: none;
      }

      @media (min-width: 480px) {
        .btn-text {
          display: inline;
        }
      }

      /* Custom class support */
      .btn.custom-override {
        /* Allow custom classes to override if needed */
      }
    `,
  ],
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

  getButtonClasses(): string[] {
    const classes = [this.isInWatchlist ? 'btn-filled' : 'btn-outlined'];

    if (this.customClass) {
      classes.push('custom-override', this.customClass);
    }

    return classes;
  }
}
