import {
  Component,
  AfterViewInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HighlightSlectedMenuRoute } from '../side-bar/side-bar.service';
import { IconLibComponent } from '../../svg-icons/icon-lib.component';
import { TmdbService } from '../../services/tmdb.service';
import { ClickOutsideDirective } from './click-outside.directive';
import { WatchlistService } from '../../services/watchlist.service';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-nav-bar',
  templateUrl: './nav-bar.component.html',
  standalone: true,
  imports: [
    FormsModule,
    RouterModule,
    CommonModule,
    IconLibComponent,
    ClickOutsideDirective,
  ],
  providers: [HighlightSlectedMenuRoute, TmdbService],
  changeDetection: ChangeDetectionStrategy.OnPush, // Enable OnPush strategy
})
export class NavBarComponent implements AfterViewInit, OnDestroy {
  query = '';
  searchResults: any[] = [];
  showMobileMenu = false;
  isMobile = false;
  navBarWidth = '250px';

  // Cache sources to avoid repeated localStorage access
  private _sources: any[] = [];

  // Cleanup subject
  private destroy$ = new Subject<void>();

  // Resize subject for debouncing
  private resize$ = new Subject<void>();

  menuItems = [
    { label: 'Home', route: '', svg: 'home' },
    { label: 'Discover', route: '/discover', svg: 'search' },
    { label: 'Watchlist', route: '/watchlist', svg: 'bookmarks' },
    { label: 'History', route: '/history', svg: 'history' },
  ];

  // Cache filtered menu items
  private _filteredMenuItems: any[] = [];

  get filteredMenuItems() {
    if (this._filteredMenuItems.length === 0) {
      this._filteredMenuItems = this.menuItems.filter((item) => {
        if (item.route === '/watchlist') {
          return this.watchlistService.isEnabled();
        }
        return true;
      });
    }
    return this._filteredMenuItems;
  }

  constructor(
    private http: HttpClient,
    private router: Router,
    private highlightSlectedMenuRoute: HighlightSlectedMenuRoute,
    private tmdbService: TmdbService,
    public watchlistService: WatchlistService,
    private cdr: ChangeDetectorRef // Add ChangeDetectorRef
  ) {
    // Load sources once in constructor
    this.loadSources();

    // Set up debounced resize handler
    this.resize$
      .pipe(
        debounceTime(150), // Debounce resize events
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.handleResize();
      });
  }

  ngAfterViewInit() {
    this.highlightSlectedMenuRoute.ngAfterViewInit();
    this.checkIsMobile();

    // Use single optimized resize listener
    this.setupResizeListener();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupResizeListener() {
    // Use passive event listener for better performance
    window.addEventListener('resize', this.onResize, { passive: true });
  }

  // Bound function for easier cleanup
  private onResize = () => {
    this.resize$.next();
  };

  private handleResize() {
    this.checkIsMobile();
    this.updateNavBarWidth();
    this.cdr.markForCheck(); // Trigger change detection
  }

  private loadSources() {
    try {
      const storedData = localStorage.getItem('sources');
      this._sources = storedData ? JSON.parse(storedData) : [];
    } catch (e) {
      console.error('Error loading sources:', e);
      this._sources = [];
    }
  }

  get sources() {
    return this._sources;
  }

  // Method to refresh sources if needed
  refreshSources() {
    this.loadSources();
    this.cdr.markForCheck();
  }

  checkIsMobile() {
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth <= 768;

    // Only trigger change detection if value changed
    if (wasMobile !== this.isMobile) {
      this.cdr.markForCheck();
    }
  }

  updateNavBarWidth() {
    // Simplified without setTimeout
    const navBarElement = document.querySelector('header .w-full');
    if (navBarElement) {
      const width = navBarElement.getBoundingClientRect().width;
      this.navBarWidth = `${width}px`;
    } else {
      this.navBarWidth = this.isMobile ? '80vw' : '250px';
    }
  }

  searchMovies() {
    if (!this.query.trim()) {
      this.searchResults = [];
      this.cdr.markForCheck();
      return;
    }

    this.tmdbService
      .fetchFromTmdb('/search/multi', { query: this.query })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.searchResults = data.results.filter(
            (item: any) =>
              item.poster_path &&
              (item.media_type === 'movie' || item.media_type === 'tv')
          );
          this.cdr.markForCheck(); // Trigger change detection
        },
        error: (err) => console.error('Error fetching search results:', err),
      });

    this.router.navigate(['/searchResults', this.query]);
  }

  redirectToPlayer(item: any) {
    this.router.navigate(['/player', item.id, item.media_type]);
  }

  clearSearch() {
    this.query = '';
    this.searchResults = [];
    this.cdr.markForCheck();
  }

  focusSearchInput() {
    const searchInput = document.getElementById('search') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
    }
  }

  handleClick(event: Event) {
    this.highlightSlectedMenuRoute.handleClick(event);
  }

  isActive(route: string): boolean {
    if (route === '/discover' || route === 'discover') {
      return (
        this.router.url.startsWith('/discover') ||
        this.router.url === '/movies' ||
        this.router.url === '/tvshows' ||
        this.router.url.startsWith('/movies') ||
        this.router.url.startsWith('/tvshows')
      );
    }

    const normalizedRoute = route.startsWith('/') ? route : '/' + route;
    return this.router.isActive(normalizedRoute, {
      paths: 'exact',
      queryParams: 'ignored',
      fragment: 'ignored',
      matrixParams: 'ignored',
    });
  }

  toggleMenu(event?: Event) {
    // Prevent any propagation immediately
    if (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    // Toggle menu state
    this.showMobileMenu = !this.showMobileMenu;

    // Update navbar width when opening
    if (this.showMobileMenu) {
      // Use requestAnimationFrame for better performance
      requestAnimationFrame(() => {
        this.updateNavBarWidth();
        this.cdr.markForCheck();
      });
    } else {
      this.cdr.markForCheck();
    }
  }

  closeMenu() {
    if (this.showMobileMenu) {
      this.showMobileMenu = false;
      this.cdr.markForCheck();
    }
  }
}
