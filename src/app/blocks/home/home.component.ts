import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';

import { ContentTabsComponent } from '../../components/content-tabs/content-tabs.component';
import { CarouselComponent } from './carousel/carousel.component';
import { CommonModule } from '@angular/common';
import { ContentTabsNetflixLikeComponent } from '../../components/content-tabs-netflix-like/content-tabs-netflix-like.component';
import { LibHeaderComponent } from './lib-header/lib-header.component';
import { ContinueWatchingListComponent } from './continue-watching-list.component';
import { FormsModule } from '@angular/forms';
import { MOVIE_GENRES, TV_GENRES } from './genres';
import { IconLibComponent } from '../../svg-icons/icon-lib.component';
import { UniversalModalComponent } from '../../forms/universal-modal.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    ContentTabsNetflixLikeComponent,
    CarouselComponent,
    LibHeaderComponent,
    ContentTabsComponent,
    ContinueWatchingListComponent,
    IconLibComponent,
    FormsModule,
    UniversalModalComponent,
  ],
  templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit {
  trendingMediaType: string = 'movie';
  discoverMediaType: string = 'movie';
  enableContinueWatching = true;
  hasContinueWatching = false;

  selectedGenreId: number = 0;
  selectedMediaType: 'movie' | 'tv' = 'movie';

  showClearModal = false;

  @ViewChild('genreScrollContainer', { static: false })
  genreScrollContainer?: ElementRef<HTMLDivElement>;

  // Add this mapping at the top of the class (after imports)
  GENRE_EQUIVALENTS: { [key: number]: number } = {
    // Movie to TV
    28: 10759, // Action -> Action & Adventure
    12: 10759, // Adventure -> Action & Adventure
    14: 10765, // Fantasy -> Sci-Fi & Fantasy
    878: 10765, // Science Fiction -> Sci-Fi & Fantasy
    10752: 10768, // War -> War & Politics
    // TV to Movie (reverse mapping)
    10759: 28, // Action & Adventure -> Action
    10765: 878, // Sci-Fi & Fantasy -> Science Fiction
    10768: 10752, // War & Politics -> War
    // Add more mappings as needed
  };

  get genreList() {
    return this.selectedMediaType === 'movie' ? MOVIE_GENRES : TV_GENRES;
  }

  setRandomGenre() {
    // Only pick a genre that exists in both MOVIE_GENRES and TV_GENRES
    const movieGenreIds = new Set(MOVIE_GENRES.map((g) => g.id));
    const tvGenreIds = new Set(TV_GENRES.map((g) => g.id));
    const commonGenres = MOVIE_GENRES.filter((g) => tvGenreIds.has(g.id));
    if (commonGenres.length > 0) {
      const idx = Math.floor(Math.random() * commonGenres.length);
      this.selectedGenreId = commonGenres[idx].id;
    } else {
      // fallback: pick from movie genres if no common genres
      if (MOVIE_GENRES.length > 0) {
        const idx = Math.floor(Math.random() * MOVIE_GENRES.length);
        this.selectedGenreId = MOVIE_GENRES[idx].id;
      } else if (TV_GENRES.length > 0) {
        const idx = Math.floor(Math.random() * TV_GENRES.length);
        this.selectedGenreId = TV_GENRES[idx].id;
      } else {
        this.selectedGenreId = 0;
      }
    }
  }

  onSelectGenre(genreId: number) {
    this.selectedGenreId = genreId;
  }

  onSelectMediaType(type: 'movie' | 'tv') {
    this.selectedMediaType = type;
    const genres = this.genreList;
    if (!genres.some((g) => g.id === this.selectedGenreId)) {
      // Try to map to an equivalent genre
      const mappedId = this.GENRE_EQUIVALENTS[this.selectedGenreId];
      if (mappedId && genres.some((g) => g.id === mappedId)) {
        this.selectedGenreId = mappedId;
      } else {
        this.selectedGenreId = 0; // fallback to All genres
      }
    }
  }

  scrollGenresLeft() {
    this.genreScrollContainer?.nativeElement.scrollBy({
      left: -120,
      behavior: 'smooth',
    });
  }
  scrollGenresRight() {
    this.genreScrollContainer?.nativeElement.scrollBy({
      left: 120,
      behavior: 'smooth',
    });
  }

  ngOnInit() {
    this.setRandomGenre(); // Pick a random genre on load (only once)
    try {
      const raw = localStorage.getItem('appSettings');
      if (raw) {
        const settings = JSON.parse(raw);
        this.enableContinueWatching = settings.enableContinueWatching !== false;
      }
    } catch {
      this.enableContinueWatching = true;
    }
    // Check if continueWatching exists and is non-empty and has valid unfinished entries
    try {
      const cwRaw = localStorage.getItem('continueWatching');
      if (cwRaw) {
        const arr = JSON.parse(cwRaw);
        this.hasContinueWatching =
          Array.isArray(arr) &&
          arr.some(
            (entry: any) =>
              (entry.mediaType === 'tv' &&
                entry.currentTime < entry.duration &&
                entry.duration >= 900) ||
              (entry.mediaType === 'movie' &&
                entry.currentTime < entry.duration &&
                entry.duration >= 4200)
          );
      } else {
        this.hasContinueWatching = false;
      }
    } catch {
      this.hasContinueWatching = false;
    }
  }

  // Handler for clearing continue watching
  onClearContinueWatching() {
    this.showClearModal = true;
  }

  confirmClearContinueWatching() {
    // Find the continue watching list component and call clearAll
    const cwList = document.querySelector('app-continue-watching-list') as any;
    if (cwList && cwList.clearAll) {
      cwList.clearAll();
    } else {
      localStorage.removeItem('continueWatching');
      this.hasContinueWatching = false;
    }
    this.showClearModal = false;
  }

  cancelClearContinueWatching() {
    this.showClearModal = false;
  }

  // Handler for routing to TV Shows
  goToTVShows() {
    window.location.href = '/tvshows';
  }
}
