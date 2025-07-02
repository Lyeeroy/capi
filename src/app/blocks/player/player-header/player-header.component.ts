import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { IconLibComponent } from '../../../svg-icons/icon-lib.component';
import { CommonModule } from '@angular/common';
import { WatchlistButtonComponent } from '../../../components/watchlist-button/watchlist-button.component';

@Component({
  selector: 'app-player-header',
  standalone: true,
  template: `
    <div
      class="py-2 flex flex-col lg:flex-row justify-start lg:justify-between items-start lg:items-center gap-2 lg:gap-0"
    >
      <!-- Back Button and Watchlist -->
      <div
        class="flex items-center justify-between px-4 py-2.5 text-gray-700 dark:text-gray-200 rounded-xl w-full lg:w-fit max-w-full"
        [class.hidden]="!showName"
        [class.flex]="showName"
      >
        <button
          (click)="onGoBack()"
          class="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors duration-200 bg-transparent hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg px-2 py-1"
        >
          <app-icon-lib ico="arrowLeft" class="w-4 h-4"></app-icon-lib>
          Go Back
        </button>

        <!-- Watchlist Button -->
        <div *ngIf="responseData" class="ml-4">
          <app-watchlist-button
            [tmdbID]="responseData.id?.toString() || ''"
            [mediaType]="mediaType === 'tv' ? 'tv' : 'movie'"
            [title]="responseData.title"
            [name]="responseData.name"
            [poster_path]="responseData.poster_path"
            [overview]="responseData.overview"
            [release_date]="responseData.release_date"
            [first_air_date]="responseData.first_air_date"
            [vote_average]="responseData.vote_average"
            [genre_ids]="responseData.genre_ids"
            [customClass]="'flex items-center bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 text-white px-2 py-1.5 rounded text-sm font-medium cursor-pointer transition-colors'"
          >
            <app-icon-lib ico="bookmark" class="w-4 h-4 text-white"></app-icon-lib>
          </app-watchlist-button>
        </div>
      </div>

      <!-- Toggle Switch for Playlist/Details -->
      <div
        class="relative flex border border-gray-300 rounded-xl bg-white overflow-hidden w-full lg:w-fit max-w-full flex-shrink-0"
        [class.hidden]="!showDetailsAndPlaylist"
        [class.flex]="showDetailsAndPlaylist"
      >
        <!-- Background slider -->
        <div
          class="absolute top-0 bottom-0 bg-blue-500 transition-all duration-300 ease-out z-0"
          [style.left.%]="highlightPlaylist ? 0 : 50"
          [style.width.%]="50"
        ></div>

        <!-- Playlist Button -->
        <button
          class="relative z-10 flex-1 flex items-center justify-center px-4 py-2.5 text-sm font-medium transition-all duration-300 ease-out"
          (click)="onShowPlaylist()"
          [class.text-white]="highlightPlaylist && mediaType !== 'movie'"
          [class.text-gray-400]="mediaType === 'movie'"
          [class.text-gray-700]="!highlightPlaylist && mediaType !== 'movie'"
          [disabled]="mediaType === 'movie'"
          [class.cursor-not-allowed]="mediaType === 'movie'"
          [class.cursor-pointer]="mediaType !== 'movie'"
        >
          <app-icon-lib ico="play" class="w-4 h-4 mr-2"></app-icon-lib>
          Playlist
        </button>

        <!-- Details Button -->
        <button
          class="relative z-10 flex-1 flex items-center justify-center px-4 py-2.5 text-sm font-medium transition-all duration-300 ease-out"
          (click)="onShowDetails()"
          [class.text-white]="highlightDetails"
          [class.text-gray-700]="!highlightDetails"
          [class.cursor-not-allowed]="mediaType === 'movie' && highlightDetails"
          [class.cursor-pointer]="!(mediaType === 'movie' && highlightDetails)"
        >
          <app-icon-lib ico="menu" class="w-4 h-4 mr-2"></app-icon-lib>
          Details
        </button>
      </div>
    </div>
  `,
  imports: [IconLibComponent, CommonModule, WatchlistButtonComponent],
})
export class PlayerHeader implements OnInit {
  constructor() {}

  @Input() responseData: any = null;

  currentEpisode: number = 1;
  currentSeason: number = 1;
  names: string = '"Show Name"';

  isTitleExpanded: boolean = false;

  @Input() showName: boolean = false;
  @Input() showDetailsAndPlaylist: boolean = false;
  @Input() mediaType: string = 'tv';

  @Output() showPlaylist = new EventEmitter<void>();
  @Output() showDetails = new EventEmitter<void>();

  highlightPlaylist: boolean = true;
  highlightDetails: boolean = false;

  onGoBack() {
    window.history.back();
  }

  onShowPlaylist() {
    if (this.mediaType !== 'movie') {
      this.showPlaylist.emit();
      this.highlightPlaylist = true;
      this.highlightDetails = false;
    }
  }

  onShowDetails() {
    // Only allow toggling if it's not a movie, or if it's a movie but details are not already selected
    if (this.mediaType !== 'movie' || !this.highlightDetails) {
      this.showDetails.emit();
      this.highlightDetails = true;
      this.highlightPlaylist = false;
    }
    // If it's a movie and details are already selected, do nothing
  }

  ngOnInit() {
    if (this.mediaType === 'tv') {
      this.highlightPlaylist = true;
      this.highlightDetails = false;
    } else if (this.mediaType === 'movie') {
      this.highlightDetails = true;
      this.highlightPlaylist = false;
    }
  }
}
