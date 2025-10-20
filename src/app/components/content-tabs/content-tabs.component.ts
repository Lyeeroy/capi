import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  OnDestroy,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { TmdbService } from '../../services/tmdb.service';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subscription, forkJoin } from 'rxjs';

@Component({
  selector: 'app-content-tabs',
  templateUrl: './content-tabs.component.html',
  imports: [CommonModule, RouterModule],
  standalone: true,
})
export class ContentTabsComponent implements OnInit, OnDestroy, OnChanges {
  @Input() trending: any[] = [];
  @Input() apiEndpoint?: string;
  @Input() genreId: number = 0;
  @Input() sortBy?: string;
  @Input() isAnime: boolean = false;
  @Input() excludeAnime: boolean = false;

  // Output event to notify parent when filtering results in fewer items than expected
  @Output() itemsFiltered = new EventEmitter<{
    requested: number;
    received: number;
    displayed: number;
  }>();

  private _tileLimit = 12;
  @Input() set tileLimit(value: number) {
    this._tileLimit = value;
    this.fetchData();
  }

  private subscription: Subscription | null = null;

  constructor(private tmdbService: TmdbService, private router: Router) {}

  ngOnInit(): void {
    this.fetchData();
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['apiEndpoint'] ||
      changes['genreId'] ||
      changes['sortBy'] ||
      changes['tileLimit'] ||
      changes['isAnime'] ||
      changes['excludeAnime']
    ) {
      this.fetchData();
    }
  }

  private fetchData(): void {
    if (!this.apiEndpoint) return;

    this.subscription?.unsubscribe();

    // Parse the sortBy parameter which contains multiple parameters in URL query format
    const params: any = {};

    if (this.sortBy) {
      const searchParams = new URLSearchParams(this.sortBy);
      searchParams.forEach((value, key) => {
        params[key] = value;
      });
    }

    // Add genre filter
    if (this.genreId !== 0) {
      params.with_genres = this.genreId;
    }

    // Add anime-specific filters
    if (this.isAnime) {
      params.with_origin_country = 'JP';
      params.with_original_language = 'ja';
      // Also ensure we're getting Animation genre
      if (this.genreId === 0) {
        params.with_genres = 16; // Force Animation genre if no genre specified
      }
    }

    this.fetchDataWithPages(params, 1, [], 0);
  }

  private fetchDataWithPages(
    params: any,
    attempt: number,
    accumulatedResults: any[] = [],
    totalReceived: number = 0
  ): void {
    const itemsPerPage = 20;
    const maxAttempts = 10; // Prevent infinite loops

    // Calculate how many pages we need, with extra buffer for filtering
    const basePages = Math.ceil(this._tileLimit / itemsPerPage);
    const bufferMultiplier = this.isAnime || this.excludeAnime ? 3 : 1; // Extra pages for heavy filtering
    const pagesNeeded = Math.min(basePages * bufferMultiplier, 5); // Cap at 5 pages per attempt

    const requests = Array.from({ length: pagesNeeded }, (_, i) =>
      this.tmdbService.fetchFromTmdb(this.apiEndpoint!, {
        ...params,
        page: (attempt - 1) * pagesNeeded + i + 1,
      })
    );

    this.subscription = forkJoin(requests).subscribe((pagesData) => {
      const newResultsCount = pagesData.reduce(
        (acc, page) => acc + (page.results?.length || 0),
        0
      );

      const currentTotalReceived = totalReceived + newResultsCount;

      let allResults = [
        ...accumulatedResults,
        ...pagesData
          .reduce((acc, page) => acc.concat(page.results), [])
          .filter((item: { poster_path: any }) => item.poster_path),
      ];

      // Additional anime filtering for non-discover endpoints (trending, top_rated, etc.) or search results
      if (
        this.isAnime &&
        (this.apiEndpoint?.includes('/search/') ||
          !this.apiEndpoint?.includes('/discover/'))
      ) {
        allResults = allResults.filter((item: any) => {
          const isJapanese =
            item.origin_country?.includes('JP') ||
            item.original_language === 'ja';
          const hasAnimeGenre = item.genre_ids?.includes(16); // Animation genre

          // More strict anime filtering - require Japanese origin AND animation genre
          const isLikelyAnime =
            isJapanese &&
            hasAnimeGenre &&
            // Check for anime-style keywords in title/name
            (this.hasAnimeKeywords(item.title || item.name || '') ||
              // Or if it's a TV series (not a movie) from Japan with animation
              ((item.media_type === 'tv' || !item.media_type) &&
                !this.isLikelyMovie(item)));

          return isLikelyAnime;
        });
      }

      // Exclude anime content when excludeAnime is true (for TV Shows tab)
      if (this.excludeAnime) {
        allResults = allResults.filter((item: any) => {
          const isJapanese =
            item.origin_country?.includes('JP') ||
            item.original_language === 'ja';
          const hasAnimeGenre = item.genre_ids?.includes(16); // Animation genre

          // Check if this looks like anime content
          const isLikelyAnime =
            isJapanese &&
            hasAnimeGenre &&
            (this.hasAnimeKeywords(item.title || item.name || '') ||
              ((item.media_type === 'tv' || !item.media_type) &&
                !this.isLikelyMovie(item)));

          // Return items that are NOT anime
          return !isLikelyAnime;
        });
      }

      // If we don't have enough results and can try again, fetch more pages
      if (
        allResults.length < this._tileLimit &&
        attempt < maxAttempts &&
        newResultsCount > 0
      ) {
        console.log(
          `Not enough results after filtering (${allResults.length}/${
            this._tileLimit
          }). Fetching more pages (attempt ${attempt + 1}).`
        );
        this.fetchDataWithPages(
          params,
          attempt + 1,
          allResults,
          currentTotalReceived
        );
        return;
      }

      // If we still don't have enough results after multiple attempts,
      // and we're heavily filtering, consider relaxing the filters slightly
      if (
        allResults.length < this._tileLimit * 0.3 && // Less than 30% of desired results
        attempt >= 3 && // After several attempts
        (this.isAnime || this.excludeAnime)
      ) {
        console.warn(
          `Very few results after heavy filtering. Consider adjusting filter criteria.`
        );
      }

      const finalResults = allResults.slice(0, this._tileLimit);
      this.trending = finalResults;

      // Emit filtering information to parent component
      this.itemsFiltered.emit({
        requested: this._tileLimit,
        received: currentTotalReceived,
        displayed: finalResults.length,
      });
    });
  }

  redirectToPlayer(index: number): void {
    const selectedItem = this.trending[index];
    const mediaType = this.getMediaType(selectedItem);
    this.router.navigate(['/player', selectedItem.id, mediaType]);
  }

  private getMediaType(item: any): string {
    if (item.media_type) return item.media_type;
    // If this is anime content, treat it as TV
    if (this.isAnime) return 'tv';
    // Infer type from the endpoint if media_type is not available
    return this.apiEndpoint?.includes('/tv/') ? 'tv' : 'movie';
  }

  trackByFn(index: number, item: any): number {
    return item.id;
  }

  // Helper method to detect anime-like keywords
  private hasAnimeKeywords(title: string): boolean {
    const animeKeywords = [
      // Common anime suffixes/patterns
      '～',
      '〜',
      '！',
      '？', // Japanese punctuation
      // Common anime title patterns
      'season',
      'part',
      'episode', // Series indicators
      // Japanese words commonly in anime titles
      'no ',
      'wa ',
      'ni ',
      'to ',
      'ga ',
      'de ',
      'wo ', // Japanese particles
      // Anime-specific terms
      'sensei',
      'senpai',
      'chan',
      'kun',
      'sama',
      'san',
      'anime',
      'manga',
      'otaku',
      'shounen',
      'shoujo',
      'seinen',
      'josei',
      // Common anime genres/themes
      'mecha',
      'isekai',
      'magical girl',
      'slice of life',
      // Japanese cultural elements
      'tokyo',
      'kyoto',
      'osaka',
      'shibuya',
      'harajuku',
      'high school',
      'academy',
      'club',
    ];

    const lowerTitle = title.toLowerCase();
    return animeKeywords.some((keyword) =>
      lowerTitle.includes(keyword.toLowerCase())
    );
  }

  // Helper method to exclude obvious movies
  private isLikelyMovie(item: any): boolean {
    const title = (item.title || item.name || '').toLowerCase();
    const overview = (item.overview || '').toLowerCase();

    // Check for movie indicators
    const movieIndicators = [
      'movie',
      'film',
      'cinema',
      'studio ghibli', // Ghibli films are movies, not series
      'makoto shinkai', // Known for anime movies
      'mamoru hosoda', // Known for anime movies
    ];

    const hasMovieIndicators = movieIndicators.some(
      (indicator) => title.includes(indicator) || overview.includes(indicator)
    );

    // Check if it has episode count (series indicator)
    const hasEpisodeCount =
      item.number_of_episodes && item.number_of_episodes > 1;

    return hasMovieIndicators && !hasEpisodeCount;
  }
}
