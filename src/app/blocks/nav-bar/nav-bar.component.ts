import { Component, AfterViewInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HighlightSlectedMenuRoute } from '../side-bar/side-bar.service';
import { IconLibComponent } from '../../svg-icons/icon-lib.component';

@Component({
  selector: 'app-nav-bar',
  templateUrl: './nav-bar.component.html',
  standalone: true,
  imports: [FormsModule, RouterModule, CommonModule, IconLibComponent],
  providers: [HighlightSlectedMenuRoute],
})
export class NavBarComponent implements AfterViewInit {
  BASE_URL = 'https://api.themoviedb.org/3';
  API_KEY = '2c6781f841ce2ad1608de96743a62eb9';
  query = '';
  searchResults: any[] = [];

  menuItems = [
    { label: 'Home', route: '', svg: 'home' },
    { label: 'TV Shows', route: '/tvshows', svg: 'tvshow' },
    { label: 'Movies', route: '/movies', svg: 'movie' },
    { label: 'Anime', route: '/anime', svg: 'anime' },
  ];

  constructor(
    private http: HttpClient,
    private router: Router,
    private highlightSlectedMenuRoute: HighlightSlectedMenuRoute
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

    this.http
      .get<any>(
        `${this.BASE_URL}/search/multi?api_key=${this.API_KEY}&query=${this.query}`
      )
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

  handleClick(event: Event) {
    this.highlightSlectedMenuRoute.handleClick(event);
  }

  isActive(route: string): boolean {
    return this.router.isActive(route, {
      paths: 'exact',
      queryParams: 'exact',
      fragment: 'ignored',
      matrixParams: 'ignored',
    });
  }
}
