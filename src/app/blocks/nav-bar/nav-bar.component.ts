import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HighlightSlectedMenuRoute } from '../side-bar/side-bar.service';
import { IconLibComponent } from '../../svg-icons/icon-lib.component';
import { TmdbService } from '../../services/tmdb.service'; // Import TmdbService
import { ClickOutsideDirective } from './click-outside.directive'; // Import ClickOutsideDirective

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
  providers: [HighlightSlectedMenuRoute, TmdbService], // Add TmdbService to providers
})
export class NavBarComponent implements AfterViewInit, OnDestroy {
  query = '';
  searchResults: any[] = [];
  showMobileMenu = false;
  isMobile = false;
  navBarWidth = '250px';

  menuItems = [
    { label: 'Home', route: '', svg: 'home' },
    { label: 'TV Shows', route: '/tvshows', svg: 'tvshow' },
    { label: 'Movies', route: '/movies', svg: 'movie' },
    { label: 'Anime', route: '/discover/anime', svg: 'anime' }, // changed route
  ];

  constructor(
    private http: HttpClient,
    private router: Router,
    private highlightSlectedMenuRoute: HighlightSlectedMenuRoute,
    private tmdbService: TmdbService // Inject TmdbService
  ) {}

  ngAfterViewInit() {
    this.highlightSlectedMenuRoute.ngAfterViewInit();
    this.checkIsMobile();
    this.updateNavBarWidth();
    window.addEventListener('resize', this.checkIsMobile.bind(this));
    window.addEventListener('resize', this.updateNavBarWidth.bind(this));
  }

  ngOnDestroy() {
    window.removeEventListener('resize', this.checkIsMobile.bind(this));
    window.removeEventListener('resize', this.updateNavBarWidth.bind(this));
  }

  checkIsMobile() {
    this.isMobile = window.innerWidth <= 768;
  }

  updateNavBarWidth() {
    // Get the actual navbar width to match it with the menu
    setTimeout(() => {
      const navBarElement = document.querySelector('header .w-full');
      if (navBarElement) {
        const width = navBarElement.getBoundingClientRect().width;
        this.navBarWidth = `${width}px`;
      } else {
        // Fallback to previous logic
        this.navBarWidth = this.isMobile ? '80vw' : '250px';
      }
    }, 0);
  }

  get sources() {
    const storedData = localStorage.getItem('sources');
    return storedData ? JSON.parse(storedData) : [];
  }

  searchMovies() {
    if (!this.query.trim()) {
      this.searchResults = [];
      return;
    }

    // Use TmdbService's fetchFromTmdb instead of hardcoded fetch
    this.tmdbService
      .fetchFromTmdb('/search/multi', { query: this.query })
      .subscribe({
        next: (data) => {
          this.searchResults = data.results.filter(
            (item: any) =>
              item.poster_path &&
              (item.media_type === 'movie' || item.media_type === 'tv')
          );
          console.log(this.searchResults);
        },
        error: (err) => console.error('Error fetching search results:', err),
      });

    this.router.navigate(['/searchResults', this.query]);
  }

  redirectToPlayer(item: any) {
    this.router.navigate(['/player', item.id, item.media_type]);
  }

  clearSearch() {
    this.query = ''; // Clear query
    this.searchResults = []; // Clear results
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
    // Use Angular's router.isActive for robust matching
    const normalizedRoute = route.startsWith('/') ? route : '/' + route;
    return this.router.isActive(normalizedRoute, {
      paths: 'exact',
      queryParams: 'ignored',
      fragment: 'ignored',
      matrixParams: 'ignored',
    });
  }

  toggleMenu(event?: Event) {
    // Prevent event propagation to avoid conflicts with click-outside directive
    if (event) {
      event.stopPropagation();
    }

    // Simple toggle - if open, close it; if closed, open it
    this.showMobileMenu = !this.showMobileMenu;

    // Update navbar width when opening menu to ensure they match
    if (this.showMobileMenu) {
      this.updateNavBarWidth();
    }
  }

  closeMenu() {
    this.showMobileMenu = false;
  }
}
