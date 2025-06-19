import { Injectable } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { forkJoin, Observable } from 'rxjs';
import { TmdbService } from '../../../services/tmdb.service';

// Interfaces
export interface Episode {
  number: number;
  name: string;
  description?: string;
}

export interface TMDBResponse {
  id: number;
  name?: string;
  title?: string;
  poster_path?: string;
  runtime?: number;
  episode_run_time?: number[];
  number_of_seasons?: number;
  seasons?: any[];
  episodes?: any[];
}

@Injectable({
  providedIn: 'root'
})
export class EpisodeManagementService {
  // Season/Episode data
  seasonNumber: number | null = 0;
  totalSeasons: number[] = [];
  episodeNames: Record<number, Episode[]> = {};
  episodePosters: Record<number, string[]> = {};
  currentEpisodes: Episode[] = [];
  currentPosters: string[] = [];

  // Current state
  currentSeason: number = 1;
  currentEpisode: number = 1;
  activeEpisodeIndex: number = -1;
  activeEpisodeSeason: number = 1;

  // Sorting state
  isSortedAscending = true;

  // Media info
  id: number | null = null;
  mediaType: 'tv' | 'movie' | null = null;
  responseData: TMDBResponse | null = null;

  constructor(
    private tmdbService: TmdbService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location
  ) {}

  /**
   * Initialize episode data for TV shows
   */
  initializeEpisodeData(id: number, mediaType: 'tv' | 'movie'): Observable<TMDBResponse> {
    this.id = id;
    this.mediaType = mediaType;

    if (mediaType === 'tv') {
      return this.tmdbService.callAPI('https://api.themoviedb.org/3', `/tv/${id}`, 'tv');
    } else {
      return this.tmdbService.callAPI('https://api.themoviedb.org/3', `/movie/${id}`, 'movie');
    }
  }

  /**
   * Load all season data for a TV show
   */
  getAllSeasonData(): Observable<any[]> {
    if (!this.seasonNumber) {
      throw new Error('Season number not available');
    }

    this.totalSeasons = Array.from({ length: this.seasonNumber }, (_, i) => i + 1);
    
    const seasonObservables = this.totalSeasons.map((seasonNum) =>
      this.tmdbService.callAPI(
        'https://api.themoviedb.org/3',
        `/tv/${this.id}/season/${seasonNum}`,
        'tv'
      )
    );

    return forkJoin(seasonObservables);
  }

  /**
   * Process season data and store episodes/posters
   */
  processSeasonData(responses: any[]): void {
    responses.forEach((response, index) => {
      if (response?.episodes) {
        const seasonNum = index + 1;
        this.episodeNames[seasonNum] = response.episodes.map(
          (episode: any, episodeIndex: number) => ({
            number: episodeIndex + 1,
            name: episode.name,
            description: episode.overview || 'No description available.',
          })
        );
        this.episodePosters[seasonNum] = response.episodes.map(
          (episode: any) =>
            episode.still_path
              ? `https://image.tmdb.org/t/p/w500${episode.still_path}`
              : 'https://miro.medium.com/v2/resize:fit:300/0*E6pTrKTFvvLDOzzj.png'
        );
      }
    });
  }

  /**
   * Update current episodes for the selected season
   */
  updateCurrentEpisodes(seasonNumber: number): void {
    if (this.episodeNames[seasonNumber] && this.episodePosters[seasonNumber]) {
      this.currentEpisodes = this.episodeNames[seasonNumber];
      this.currentPosters = this.episodePosters[seasonNumber];

      // Only set active episode index if we're viewing the season of the currently playing episode
      if (seasonNumber === this.activeEpisodeSeason) {
        const idx = this.currentEpisodes.findIndex(
          (ep) => ep.number === this.currentEpisode
        );
        this.activeEpisodeIndex = idx !== -1 ? idx : -1;
      } else {
        this.activeEpisodeIndex = -1;
      }
    } else {
      this.currentEpisodes = [];
      this.currentPosters = [];
      this.activeEpisodeIndex = -1;
    }
  }

  /**
   * Set the active episode index properly
   */
  setActiveEpisodeIndex(): void {
    if (this.currentEpisodes && this.currentEpisodes.length > 0) {
      const idx = this.currentEpisodes.findIndex(
        (ep) => ep.number === this.currentEpisode
      );
      this.activeEpisodeIndex = idx !== -1 ? idx : -1;
      this.activeEpisodeSeason = this.currentSeason;
    }
  }

  /**
   * Handle season change
   */
  onSeasonChange(newSeason: number): void {
    this.currentSeason = newSeason;
    this.updateCurrentEpisodes(this.currentSeason);

    // Only update activeEpisodeIndex if we're changing to the season of the currently playing episode
    if (newSeason === this.activeEpisodeSeason) {
      const idx = this.currentEpisodes.findIndex(
        (ep) => ep.number === this.currentEpisode
      );
      this.activeEpisodeIndex = idx !== -1 ? idx : -1;
    } else {
      this.activeEpisodeIndex = -1;
    }
  }

  /**
   * Sort episodes ascending or descending
   */
  ascOrDescSort(): void {
    this.currentEpisodes.reverse();
    this.currentPosters.reverse();
    this.isSortedAscending = !this.isSortedAscending;
    this.updateActiveEpisodeIndex();
  }

  /**
   * Update active episode index after sorting
   */
  updateActiveEpisodeIndex(): void {
    if (!this.currentEpisodes || !Array.isArray(this.currentEpisodes)) {
      this.activeEpisodeIndex = -1;
      return;
    }
    const idx = this.currentEpisodes.findIndex(
      (ep) => ep.number === this.currentEpisode
    );
    this.activeEpisodeIndex = idx !== -1 ? idx : -1;
  }

  /**
   * Navigate to next episode with proper sorting logic
   */
  nextEpisode(): { success: boolean; needsSeasonChange?: boolean; newSeason?: number } {
    if (!this.isViewingSameSeasonAsActive()) {
      return { success: false };
    }

    const currentIndex = this.activeEpisodeIndex;
    if (currentIndex === -1) return { success: false };

    let nextIndex: number;
    if (this.isSortedAscending) {
      nextIndex = currentIndex + 1;
      if (nextIndex >= this.currentEpisodes.length) {
        if (this.currentSeason < this.totalSeasons.length) {
          return { success: false, needsSeasonChange: true, newSeason: this.currentSeason + 1 };
        }
        return { success: false };
      }
    } else {
      nextIndex = currentIndex - 1;
      if (nextIndex < 0) {
        if (this.currentSeason < this.totalSeasons.length) {
          return { success: false, needsSeasonChange: true, newSeason: this.currentSeason + 1 };
        }
        return { success: false };
      }
    }

    const nextEpisode = this.currentEpisodes[nextIndex];
    if (nextEpisode) {
      this.currentEpisode = nextEpisode.number;
      this.activeEpisodeIndex = nextIndex;
      this.activeEpisodeSeason = this.currentSeason;
      return { success: true };
    }

    return { success: false };
  }

  /**
   * Navigate to previous episode with proper sorting logic
   */
  prevEpisode(): { success: boolean; needsSeasonChange?: boolean; newSeason?: number } {
    if (!this.isViewingSameSeasonAsActive()) {
      return { success: false };
    }

    const currentIndex = this.activeEpisodeIndex;
    if (currentIndex === -1) return { success: false };

    let prevIndex: number;
    if (this.isSortedAscending) {
      prevIndex = currentIndex - 1;
      if (prevIndex < 0) {
        if (this.currentSeason > 1) {
          return { success: false, needsSeasonChange: true, newSeason: this.currentSeason - 1 };
        }
        return { success: false };
      }
    } else {
      prevIndex = currentIndex + 1;
      if (prevIndex >= this.currentEpisodes.length) {
        if (this.currentSeason > 1) {
          return { success: false, needsSeasonChange: true, newSeason: this.currentSeason - 1 };
        }
        return { success: false };
      }
    }

    const prevEpisode = this.currentEpisodes[prevIndex];
    if (prevEpisode) {
      this.currentEpisode = prevEpisode.number;
      this.activeEpisodeIndex = prevIndex;
      this.activeEpisodeSeason = this.currentSeason;
      return { success: true };
    }

    return { success: false };
  }

  /**
   * Move to next season
   */
  moveToNextSeason(): void {
    this.currentSeason++;
    this.updateCurrentEpisodes(this.currentSeason);

    // When moving to next season, start from the beginning based on sort order
    if (this.isSortedAscending) {
      this.setCurrentEpisode(1);
    } else {
      const firstEpisode = this.currentEpisodes[0];
      if (firstEpisode) {
        this.setCurrentEpisode(firstEpisode.number);
      }
    }
  }

  /**
   * Move to previous season
   */
  moveToPreviousSeason(): void {
    this.currentSeason--;
    this.updateCurrentEpisodes(this.currentSeason);

    // When moving to previous season, start from the end based on sort order
    if (this.isSortedAscending) {
      const lastEpisode = this.currentEpisodes[this.currentEpisodes.length - 1];
      if (lastEpisode) {
        this.setCurrentEpisode(lastEpisode.number);
      }
    } else {
      this.setCurrentEpisode(1);
    }
  }

  /**
   * Set current episode
   */
  setCurrentEpisode(episodeNumber: number): void {
    this.currentEpisode = episodeNumber;
    const idx = this.currentEpisodes.findIndex(
      (ep) => ep.number === episodeNumber
    );
    this.activeEpisodeIndex = idx !== -1 ? idx : -1;
    this.activeEpisodeSeason = this.currentSeason;
  }

  /**
   * Check if viewing same season as active
   */
  isViewingSameSeasonAsActive(): boolean {
    return (
      this.currentSeason === this.activeEpisodeSeason &&
      this.activeEpisodeIndex >= 0
    );
  }

  /**
   * Check if there's a next episode available
   */
  hasNextEpisode(): boolean {
    if (!this.isViewingSameSeasonAsActive()) {
      return false;
    }

    const currentIndex = this.activeEpisodeIndex;
    if (currentIndex === -1) return false;

    if (this.isSortedAscending) {
      return (
        currentIndex < this.currentEpisodes.length - 1 ||
        this.currentSeason < this.totalSeasons.length
      );
    } else {
      return currentIndex > 0 || this.currentSeason < this.totalSeasons.length;
    }
  }

  /**
   * Check if there's a previous episode available
   */
  hasPreviousEpisode(): boolean {
    if (!this.isViewingSameSeasonAsActive()) {
      return false;
    }
    const currentIndex = this.activeEpisodeIndex;
    if (currentIndex === -1) return false;

    if (this.isSortedAscending) {
      return currentIndex > 0 || this.currentSeason > 1;
    } else {
      return (
        currentIndex < this.currentEpisodes.length - 1 || this.currentSeason > 1
      );
    }
  }

  /**
   * Get next episode label for UI
   */
  getNextEpisodeLabel(): string {
    if (!this.isViewingSameSeasonAsActive()) {
      return 'Next Episode';
    }

    const currentIndex = this.activeEpisodeIndex;
    if (currentIndex === -1) return 'Next Episode';

    if (this.isSortedAscending) {
      if (currentIndex < this.currentEpisodes.length - 1) {
        return 'Next Episode';
      } else if (this.currentSeason < this.totalSeasons.length) {
        return `Season ${this.currentSeason + 1} Ep 1`;
      }
    } else {
      if (currentIndex > 0) {
        return 'Next Episode';
      } else if (this.currentSeason < this.totalSeasons.length) {
        return `Season ${this.currentSeason + 1} Ep 1`;
      }
    }
    return 'Next Episode';
  }

  /**
   * Get previous episode label for UI
   */
  getPreviousEpisodeLabel(): string {
    if (!this.isViewingSameSeasonAsActive()) {
      return 'Prev Episode';
    }

    const currentIndex = this.activeEpisodeIndex;
    if (currentIndex === -1) return 'Prev Episode';

    if (this.isSortedAscending) {
      if (currentIndex > 0) {
        return 'Prev Episode';
      } else if (this.currentSeason > 1) {
        const prevSeasonEpisodes = this.episodeNames[this.currentSeason - 1];
        const lastEpNum = prevSeasonEpisodes?.length || 1;
        return `S${this.currentSeason - 1} Ep ${lastEpNum}`;
      }
    } else {
      if (currentIndex < this.currentEpisodes.length - 1) {
        return 'Prev Episode';
      } else if (this.currentSeason > 1) {
        return `S${this.currentSeason - 1} Ep 1`;
      }
    }
    return 'Prev Episode';
  }

  /**
   * Update URL with current season and episode
   */
  updateUrl(): void {
    const url = new URL(window.location.href);
    const queryParams = new URLSearchParams(url.search);
    queryParams.set('season', this.currentSeason.toString());
    queryParams.set('episode', this.currentEpisode.toString());
    const newUrl = `${url.pathname}?${queryParams.toString()}`;
    this.location.replaceState(newUrl);
  }

  /**
   * Play specific episode
   */
  playEpisode(index: number): void {
    if (this.currentEpisodes[index]) {
      this.currentEpisode = this.currentEpisodes[index].number;
      this.activeEpisodeIndex = index;
      this.activeEpisodeSeason = this.currentSeason;
    } else {
      this.activeEpisodeIndex = -1;
    }
  }
}
