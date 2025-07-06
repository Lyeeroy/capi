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
import { TmdbService } from '../../services/tmdb.service';
import { Subscription, firstValueFrom } from 'rxjs';
import { IconLibComponent } from '../../svg-icons/icon-lib.component';

const INITIAL_SEARCH_TILE_LIMIT = 14;
const SEARCH_TILE_INCREMENT = 7;
const DEBOUNCE_INTERVAL = 500; // 500 milliseconds

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
  url: string = '';
  tileLimit: number = INITIAL_SEARCH_TILE_LIMIT;
  totalResults: number = 0;
  isLoadingQuery: boolean = false;
  isLoadingMore: boolean = false;
  private debounceTimeout: any;
  private readonly scrollLoadCooldown: number = 1000;
  private readonly initialFillLoadCooldown: number = 300;
  private readonly initialFillMaxAttempts: number = 5;
  private initialFillAttempts: number = 0;
  public initialSetupDoneForQuery: boolean = false;
  private paramMapSubscription: Subscription | undefined;
  searchResults: any[] = [];
  private lastLoadTime: number = 0;
  mediaType: string = 'all';

  constructor(
    private route: ActivatedRoute,
    private tmdbService: TmdbService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.paramMapSubscription = this.route.paramMap.subscribe(
      async (params) => {
        const newQuery = params.get('query') || '';
        if (this.query !== newQuery || (newQuery && !this.url)) {
          this.query = newQuery;
          this.initialSetupDoneForQuery = false;
          this.debouncedPerformSearch(newQuery);
        } else if (!newQuery) {
          this.query = '';
          this.url = '';
          this.tileLimit = INITIAL_SEARCH_TILE_LIMIT;
          this.totalResults = 0;
          this.searchResults = [];
          this.isLoadingQuery = false;
          this.isLoadingMore = false;
          this.initialFillAttempts = 0;
          this.cdr.detectChanges();
        }
      }
    );
  }

  debouncedPerformSearch(query: string): void {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    this.isLoadingQuery = true; // Show loading indicator immediately
    this.cdr.detectChanges();

    this.debounceTimeout = setTimeout(async () => {
      await this.performSearch(query);
    }, DEBOUNCE_INTERVAL);
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

    // Build endpoint based on mediaType
    let endpoint = '/search/multi';
    let params: any = { query: currentQuery };
    if (this.mediaType === 'movie') {
      endpoint = '/search/movie';
    } else if (this.mediaType === 'tv') {
      endpoint = '/search/tv';
    } else if (this.mediaType === 'anime') {
      // If you have a specific anime endpoint, set it here. Otherwise, filter results in the UI.
      endpoint = '/search/anime'; // fallback, adjust as needed
    }
    this.url = `${endpoint}?query=${encodeURIComponent(currentQuery)}`;
    this.tileLimit = INITIAL_SEARCH_TILE_LIMIT;
    this.totalResults = 0;
    this.searchResults = [];
    this.initialFillAttempts = 0;
    this.isLoadingQuery = true;
    this.isLoadingMore = false;
    this.cdr.detectChanges();

    try {
      const data = await firstValueFrom(
        this.tmdbService.fetchFromTmdb(endpoint, params)
      );
      this.totalResults = data.total_results || 0;
      if (this.totalResults === 0) {
        this.tileLimit = 0;
      } else {
        this.tileLimit = Math.min(INITIAL_SEARCH_TILE_LIMIT, this.totalResults);
      }
    } catch (error) {
      this.totalResults = 0;
      this.tileLimit = 0;
    } finally {
      this.isLoadingQuery = false;
      this.initialSetupDoneForQuery = true;
      this.cdr.detectChanges();
    }

    if (this.totalResults > 0 && this.initialSetupDoneForQuery) {
      setTimeout(() => {
        this.fillScreenIfNeeded();
        this.scheduleFillCheck(); // Schedule a check after initial fill
      }, 150);
    }
  }

  ngAfterViewInit(): void {
    if (this.query && this.totalResults > 0 && this.initialSetupDoneForQuery) {
      setTimeout(() => {
        this.fillScreenIfNeeded();
        this.scheduleFillCheck(); // Schedule a check after view init
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
      return;
    }
    this.checkScroll();
  }

  private checkScroll(): void {
    requestAnimationFrame(() => {
      if (this.isLoadingMore || this.tileLimit >= this.totalResults) {
        return;
      }

      const now = Date.now();
      if (
        now - this.lastLoadTime < this.scrollLoadCooldown &&
        !this.isScreenNotFull()
      ) {
        return;
      }

      const scrollPosition = window.innerHeight + window.scrollY;
      const documentHeight = document.documentElement.scrollHeight;
      const threshold = window.innerHeight;

      if (this.isScreenNotFull()) {
        this.fillScreenIfNeeded();
      } else if (scrollPosition >= documentHeight - threshold) {
        this.loadMoreItems(false);
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
      return;
    }
    if (this.tileLimit >= this.totalResults && this.totalResults > 0) {
      return;
    }
    if (this.totalResults === 0 && this.query) {
      return;
    }

    requestAnimationFrame(() => {
      if (this.isScreenNotFull()) {
        if (this.initialFillAttempts < this.initialFillMaxAttempts) {
          this.initialFillAttempts++;
          this.loadMoreItems(true);
        }
      }
    });
  }

  private loadMoreItems(isInitialFill: boolean): void {
    if (this.isLoadingMore || this.isLoadingQuery) {
      return;
    }
    if (this.tileLimit >= this.totalResults && this.totalResults > 0) {
      return;
    }
    if (this.totalResults === 0 && this.query) {
      return;
    }

    this.lastLoadTime = Date.now();
    this.isLoadingMore = true;
    this.cdr.detectChanges();

    const newTileLimit = Math.min(
      this.tileLimit + SEARCH_TILE_INCREMENT,
      this.totalResults
    );

    if (newTileLimit === this.tileLimit) {
      this.isLoadingMore = false;
      this.cdr.detectChanges();
      return;
    }
    this.tileLimit = newTileLimit;

    const currentCooldown = isInitialFill
      ? this.initialFillLoadCooldown
      : this.scrollLoadCooldown;

    setTimeout(() => {
      this.isLoadingMore = false;
      this.cdr.detectChanges();

      if (isInitialFill) {
        this.fillScreenIfNeeded();
      } else {
        this.checkScroll();
      }
      this.scheduleFillCheck(); // Schedule a check after loading more
    }, currentCooldown);
  }

  private scheduleFillCheck(): void {
    setTimeout(() => {
      if (
        this.isScreenNotFull() &&
        this.tileLimit < this.totalResults &&
        !this.isLoadingMore &&
        !this.isLoadingQuery
      ) {
        this.fillScreenIfNeeded();
      }
    }, 500);
  }

  onMediaTypeChange(type: string) {
    if (this.mediaType !== type) {
      this.mediaType = type;
      this.performSearch(this.query);
    }
  }

  ngOnDestroy(): void {
    if (this.paramMapSubscription) {
      this.paramMapSubscription.unsubscribe();
    }
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
  }
}
