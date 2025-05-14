import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ChangeDetectorRef,
  HostListener,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ContentTabsComponent } from '../../components/content-tabs/content-tabs.component';
import { IconLibComponent } from '../../svg-icons/icon-lib.component';
import { TmdbService } from '../../services/tmdb.service';
import { Subscription, firstValueFrom } from 'rxjs'; // Import firstValueFrom

// Constants
const INITIAL_SEARCH_TILE_LIMIT = 14; // Initial number of tiles when a new search occurs
const SEARCH_TILE_INCREMENT = 7; // How many tiles to add for each load step (scroll or fill)

@Component({
  selector: 'app-search-results',
  templateUrl: './search-results.component.html',
  standalone: true,
  imports: [CommonModule, ContentTabsComponent, IconLibComponent],
})
export class SearchResultsComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  query: string = '';
  url: string = ''; // API endpoint for app-content-tabs
  tileLimit: number = INITIAL_SEARCH_TILE_LIMIT;
  totalResults: number = 0; // Total number of results available for the current query

  // --- State for loading and scrolling ---
  isLoadingQuery: boolean = false; // True when a new query is being fetched
  isLoadingMore: boolean = false; // True when loading more items via scroll/fill
  private lastLoadTime: number = 0;
  private readonly scrollLoadCooldown: number = 1000; // Cooldown for scroll-triggered loads
  private readonly initialFillLoadCooldown: number = 300; // Cooldown for programmatic fill-screen loads
  private readonly scrollThreshold: number = 200; // Pixels from bottom to trigger load

  // --- State for initial screen fill ---
  private readonly initialFillMaxAttempts: number = 5; // Max attempts to fill screen
  private initialFillAttempts: number = 0;
  public initialSetupDoneForQuery: boolean = false; // To ensure fillScreenIfNeeded is correctly timed after new query data

  private paramMapSubscription: Subscription | undefined;

  // This property can hold the first batch of results if needed for other UI,
  // or it can be removed if app-content-tabs is fully self-sufficient.
  // For infinite scroll, we primarily manage tileLimit and totalResults.
  searchResults: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private tmdbService: TmdbService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.paramMapSubscription = this.route.paramMap.subscribe(
      async (params) => {
        // make async
        const newQuery = params.get('query') || '';

        if (this.query !== newQuery || (newQuery && !this.url)) {
          // If query changed or first load with query
          this.query = newQuery;
          this.initialSetupDoneForQuery = false; // Reset for the new query
          await this.performSearch(this.query); // Await the search to get totalResults
        } else if (!newQuery) {
          // Query becomes empty
          this.query = '';
          this.url = '';
          this.tileLimit = INITIAL_SEARCH_TILE_LIMIT;
          this.totalResults = 0;
          this.searchResults = [];
          this.isLoadingQuery = false;
          this.isLoadingMore = false;
          this.initialFillAttempts = 0;
          this.cdr.detectChanges();
          console.log('SearchResults: No query. Cleared results and state.');
        }
      }
    );
  }

  async performSearch(currentQuery: string): Promise<void> {
    if (!currentQuery) {
      this.url = '';
      this.totalResults = 0;
      this.tileLimit = INITIAL_SEARCH_TILE_LIMIT;
      this.searchResults = [];
      this.isLoadingQuery = false;
      this.cdr.detectChanges();
      return;
    }

    this.url = `/search/multi?query=${encodeURIComponent(currentQuery)}`;
    this.tileLimit = INITIAL_SEARCH_TILE_LIMIT; // Reset tile limit for new search
    this.totalResults = 0; // Reset
    this.searchResults = []; // Reset
    this.initialFillAttempts = 0;
    this.isLoadingQuery = true; // Indicate main search is in progress
    this.isLoadingMore = false; // Ensure this is false
    this.cdr.detectChanges();

    try {
      // Fetch the first page of results to get total_results
      // Assuming fetchFromTmdb returns an object like { results: [], total_results: X }
      // Adjust { query: currentQuery, page: 1 } if your service needs explicit pagination for the first call
      const data = await firstValueFrom(
        this.tmdbService.fetchFromTmdb(
          '/search/multi', // Base endpoint for search
          { query: currentQuery } // Parameters; add page:1 if needed by service
        )
      );

      this.totalResults = data.total_results || 0;
      // Filter initial results if your app-content-tabs doesn't do this,
      // or if you need this.searchResults for other things.
      // this.searchResults = (data.results || []).filter(
      //   (item: any) => item.poster_path && (item.media_type === 'movie' || item.media_type === 'tv')
      // );

      console.log(
        `SearchResults: Query "${currentQuery}", Total Results: ${this.totalResults}`
      );

      if (this.totalResults === 0) {
        // No results, app-content-tabs will likely show an empty state
        this.tileLimit = 0; // Or handle this in app-content-tabs
      } else {
        // Ensure initial tileLimit respects totalResults from the start
        this.tileLimit = Math.min(INITIAL_SEARCH_TILE_LIMIT, this.totalResults);
      }
    } catch (error) {
      console.error('SearchResults: Error performing initial search:', error);
      this.totalResults = 0; // Prevent loading more on error
      this.tileLimit = 0;
    } finally {
      this.isLoadingQuery = false;
      this.initialSetupDoneForQuery = true; // Mark that initial data fetch for this query is done
      this.cdr.detectChanges();
    }

    // After data is fetched and totalResults is known,
    // and app-content-tabs has had a chance to get the new URL/tileLimit.
    if (this.totalResults > 0 && this.initialSetupDoneForQuery) {
      setTimeout(() => {
        console.log(
          'SearchResults: performSearch complete, attempting initial screen fill.'
        );
        this.fillScreenIfNeeded();
      }, 150); // Slightly longer delay to ensure app-content-tabs renders initial items
    }
  }

  ngAfterViewInit(): void {
    // ngAfterViewInit runs once. If a query is already present from URL on first load,
    // performSearch would have been called via ngOnInit.
    // The fillScreenIfNeeded will be triggered from performSearch's finally block.
    // This specific ngAfterViewInit might not need to do much if performSearch handles it.
    // However, if performSearch completes very fast before view is fully stable,
    // an additional check here can be a fallback.
    if (this.query && this.totalResults > 0 && this.initialSetupDoneForQuery) {
      setTimeout(() => {
        console.log(
          'SearchResults: ngAfterViewInit - re-checking fill screen.'
        );
        this.fillScreenIfNeeded();
      }, 200);
    }
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    if (
      this.isLoadingQuery ||
      this.isLoadingMore ||
      !this.initialSetupDoneForQuery
    ) {
      return; // Don't do anything if a query is loading, or more items are loading, or initial data isn't ready
    }
    this.checkScroll();
  }

  private checkScroll(): void {
    // Debounce or throttle this if it becomes an issue, but requestAnimationFrame helps
    requestAnimationFrame(() => {
      if (this.isLoadingMore || this.tileLimit >= this.totalResults) {
        return; // Already loading or all items shown
      }

      const now = Date.now();
      if (
        now - this.lastLoadTime < this.scrollLoadCooldown &&
        !this.isScreenNotFull()
      ) {
        // Apply cooldown only if it's a scroll-triggered load, not an initial fill
        return;
      }

      const scrollPosition = window.innerHeight + window.scrollY;
      const documentHeight = document.documentElement.scrollHeight;

      if (this.isScreenNotFull()) {
        console.log(
          'SearchResults: Screen not full during checkScroll, attempting to fill.'
        );
        this.fillScreenIfNeeded(); // Try to fill first
      } else if (scrollPosition >= documentHeight - this.scrollThreshold) {
        console.log(
          'SearchResults: Near bottom of scrollable page, loading more.'
        );
        this.loadMoreItems(false); // `false` for scroll-triggered load
      }
    });
  }

  private isScreenNotFull(): boolean {
    return document.documentElement.scrollHeight <= window.innerHeight;
  }

  private fillScreenIfNeeded(): void {
    if (
      this.isLoadingMore ||
      this.isLoadingQuery ||
      !this.initialSetupDoneForQuery
    ) {
      console.log(
        'SearchResults: fillScreenIfNeeded - busy or not ready, skipping.'
      );
      return;
    }
    if (this.tileLimit >= this.totalResults && this.totalResults > 0) {
      console.log(
        'SearchResults: fillScreenIfNeeded - All results already displayed for filling.'
      );
      return;
    }
    if (this.totalResults === 0 && this.query) {
      // Query exists but no results
      console.log(
        'SearchResults: fillScreenIfNeeded - No results to fill with.'
      );
      return;
    }

    // Run in next animation frame to ensure DOM has updated from previous tileLimit change
    requestAnimationFrame(() => {
      if (this.isScreenNotFull()) {
        if (this.initialFillAttempts < this.initialFillMaxAttempts) {
          console.log(
            `SearchResults: Screen not full. Fill Attempt ${
              this.initialFillAttempts + 1
            }/${this.initialFillMaxAttempts}. Loading more.`
          );
          this.initialFillAttempts++;
          this.loadMoreItems(true); // `true` indicates this is part of the initial screen-filling
        } else {
          console.warn(
            'SearchResults: Screen still not full, but max initial fill attempts reached.'
          );
        }
      } else {
        // console.log('SearchResults: Screen is already full or scrollable.');
      }
    });
  }

  private loadMoreItems(isInitialFill: boolean): void {
    if (this.isLoadingMore || this.isLoadingQuery) {
      console.log('SearchResults: loadMoreItems - Already loading, skipping.');
      return;
    }
    if (this.tileLimit >= this.totalResults && this.totalResults > 0) {
      console.log(
        'SearchResults: loadMoreItems - All results already displayed.'
      );
      return;
    }
    if (this.totalResults === 0 && this.query) {
      console.log('SearchResults: loadMoreItems - No results to load.');
      return;
    }

    this.lastLoadTime = Date.now();
    this.isLoadingMore = true;
    this.cdr.detectChanges(); // Show loading spinner for "more"

    // Calculate next tile limit, ensuring it doesn't exceed totalResults
    const newTileLimit = Math.min(
      this.tileLimit + SEARCH_TILE_INCREMENT,
      this.totalResults
    );

    if (newTileLimit === this.tileLimit) {
      // No change means we are at totalResults
      this.isLoadingMore = false;
      this.cdr.detectChanges();
      return;
    }
    this.tileLimit = newTileLimit;

    console.log(
      `SearchResults: Loading more items. New tileLimit: ${this.tileLimit}/${this.totalResults}. Is initial fill: ${isInitialFill}`
    );

    const currentCooldown = isInitialFill
      ? this.initialFillLoadCooldown
      : this.scrollLoadCooldown;

    setTimeout(() => {
      this.isLoadingMore = false;
      this.cdr.detectChanges(); // Hide loading spinner for "more"

      // After items are assumed to be rendered by app-content-tabs:
      if (isInitialFill) {
        this.fillScreenIfNeeded(); // Check again if more is needed for filling
      } else {
        // For scroll-triggered load, check again in case still near bottom
        // (e.g. if loaded items were very small)
        this.checkScroll();
      }
    }, currentCooldown);
  }

  ngOnDestroy(): void {
    if (this.paramMapSubscription) {
      this.paramMapSubscription.unsubscribe();
    }
    // Potentially remove window scroll listener if added manually,
    // but @HostListener handles this automatically.
  }
}
