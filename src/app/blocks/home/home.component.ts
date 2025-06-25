import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';

import { CarouselComponent } from './carousel/carousel.component';
import { CommonModule } from '@angular/common';
import { ContentTabsNetflixLikeComponent } from '../../components/content-tabs-netflix-like/content-tabs-netflix-like.component';
import { LibHeaderComponent } from './lib-header/lib-header.component';
import { ContinueWatchingListComponent } from './continue-watching-list.component';
import { FormsModule } from '@angular/forms';
import { MOVIE_GENRES, TV_GENRES } from './genres';
import { IconLibComponent } from '../../svg-icons/icon-lib.component';
import { UniversalModalComponent } from '../../forms/universal-modal.component';
import { TmdbService } from '../../services/tmdb.service';

// Interface for dev picks
interface DevPick {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    ContentTabsNetflixLikeComponent,
    CarouselComponent,
    LibHeaderComponent,
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

  // Dev's Pick feature
  devPicksMovies: any[] = [];
  devPicksTvShows: any[] = [];
  selectedDevPickType: 'movie' | 'tv' = 'tv';

  // Hardcoded dev picks - you can modify these TMDB IDs
  private devPicks: DevPick[] = [
    // Movies
    { tmdbId: 157336, mediaType: 'movie' }, // Interstellar
    { tmdbId: 335984, mediaType: 'movie' }, // Blade Runner 2049
    { tmdbId: 680, mediaType: 'movie' }, // Pulp Fiction
    { tmdbId: 603, mediaType: 'movie' }, // The Matrix
    { tmdbId: 10201, mediaType: 'movie' }, // Yes Man
    { tmdbId: 51876, mediaType: 'movie' }, // Limitless
    { tmdbId: 49530, mediaType: 'movie' }, // In Time
    { tmdbId: 808, mediaType: 'movie' }, // Shrek
    { tmdbId: 72105, mediaType: 'movie' }, // Ted
    { tmdbId: 1878, mediaType: 'movie' }, // Fear and Loathing in Las Vegas
    { tmdbId: 7512, mediaType: 'movie' }, // idiocracy
    { tmdbId: 607, mediaType: 'movie' }, // men in black
    { tmdbId: 652, mediaType: 'movie' }, // troy
    { tmdbId: 19995, mediaType: 'movie' }, // avatar

    // TV Shows
    { tmdbId: 1100, mediaType: 'tv' }, // HIMYM
    { tmdbId: 1418, mediaType: 'tv' }, // The Big Bang Theory
    { tmdbId: 1668, mediaType: 'tv' }, // Friends
    { tmdbId: 2316, mediaType: 'tv' }, // The Office
    { tmdbId: 60625, mediaType: 'tv' }, // Rick and Morty
    { tmdbId: 125988, mediaType: 'tv' }, // Silo
    { tmdbId: 100088, mediaType: 'tv' }, // The Last of Us
    { tmdbId: 87739, mediaType: 'tv' }, // The Queen's Gambit
    { tmdbId: 82856, mediaType: 'tv' }, // The Mandalorian
    { tmdbId: 106379, mediaType: 'tv' }, // Fallout
    { tmdbId: 31295, mediaType: 'tv' }, // Misfits
    { tmdbId: 94605, mediaType: 'tv' }, // Arcane
    { tmdbId: 5920, mediaType: 'tv' }, // Mentalist
    { tmdbId: 84977, mediaType: 'tv' }, // russian doll
    { tmdbId: 37680, mediaType: 'tv' }, // suits
    { tmdbId: 2288, mediaType: 'tv' }, // prison break
  ];

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

    // Load dev picks based on hardcoded TMDB IDs
    this.loadDevPicks();
  }

  constructor(private tmdbService: TmdbService) {} // New method to load dev picks
  private loadDevPicks() {
    this.devPicksMovies = [];
    this.devPicksTvShows = [];

    // Load movies
    this.devPicks
      .filter((pick) => pick.mediaType === 'movie')
      .forEach((pick) => {
        this.tmdbService.fetchItemFromTmdb(`/movie/${pick.tmdbId}`).subscribe({
          next: (data) => {
            this.devPicksMovies.push({ ...data, media_type: 'movie' });
            console.log('Loaded movie:', data);
          },
          error: (error) => {
            console.error('Error loading movie:', error);
          },
        });
      });

    // Load TV shows
    this.devPicks
      .filter((pick) => pick.mediaType === 'tv')
      .forEach((pick) => {
        this.tmdbService.fetchItemFromTmdb(`/tv/${pick.tmdbId}`).subscribe({
          next: (data) => {
            this.devPicksTvShows.push({ ...data, media_type: 'tv' });
            console.log('Loaded TV show:', data);
          },
          error: (error) => {
            console.error('Error loading TV show:', error);
          },
        });
      });
  }

  // Method to handle dev pick type selection
  onSelectDevPickType(type: 'movie' | 'tv') {
    this.selectedDevPickType = type;
  }

  // Getter for current dev picks based on selected type
  get currentDevPicks() {
    return this.selectedDevPickType === 'movie'
      ? this.devPicksMovies
      : this.devPicksTvShows;
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
