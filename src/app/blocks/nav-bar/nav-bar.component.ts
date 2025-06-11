import { Component, AfterViewInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HighlightSlectedMenuRoute } from '../side-bar/side-bar.service';
import { IconLibComponent } from '../../svg-icons/icon-lib.component';
import { TmdbService } from '../../services/tmdb.service'; // Import TmdbService

@Component({
  selector: 'app-nav-bar',
  templateUrl: './nav-bar.component.html',
  standalone: true,
  imports: [FormsModule, RouterModule, CommonModule, IconLibComponent],
  providers: [HighlightSlectedMenuRoute, TmdbService], // Add TmdbService to providers
})
export class NavBarComponent implements AfterViewInit {
  query = '';
  searchResults: any[] = [];

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
}
