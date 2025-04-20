// src/app/blocks/search-results/search-results.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ContentTabsComponent } from '../../components/content-tabs/content-tabs.component';
import { IconLibComponent } from '../../svg-icons/icon-lib.component';
import { TmdbService } from '../../services/tmdb.service'; // Import TmdbService
import { Observable } from 'rxjs';

@Component({
  selector: 'app-search-results',
  templateUrl: './search-results.component.html',
  standalone: true,
  imports: [CommonModule, ContentTabsComponent, IconLibComponent],
})
export class SearchResultsComponent implements OnInit {
  searchResults: any[] = [];
  query: string = '';
  url: string = ''; // Still needed for app-content-tabs
  tileLimit: number = 6; // Default limit for tiles

  constructor(
    private route: ActivatedRoute,
    private tmdbService: TmdbService, // Replace HttpClient with TmdbService
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const query = params.get('query') || '';
      this.resetResultsOnQueryChange(query);
      this.url = query ? `/search/multi?query=${query}` : ''; // Construct URL for app-content-tabs
      if (query) {
        this.fetchResults(query); // Fetch results when query exists
      } else {
        this.searchResults = []; // Clear results if no query
      }
    });
  }

  fetchResults(query: string) {
    this.tmdbService
      .fetchFromTmdb('/search/multi', { query }) // Use fetchFromTmdb
      .subscribe({
        next: (data) => {
          // Filter results with poster_path and valid media_type
          this.searchResults = data.results.filter(
            (item: any) =>
              item.poster_path &&
              (item.media_type === 'movie' || item.media_type === 'tv')
          );
        },
        error: (err) => console.error('Error fetching search results:', err),
      });
  }

  tileLimitOnResultLength() {
    if (this.searchResults.length > 0) {
      this.tileLimit = this.searchResults.length;
    }
  }

  resetResultsOnQueryChange(query: string) {
    this.query = query;
    this.tileLimit = 14; // Reset tile limit when query changes
  }

  showMore(number: number) {
    this.tileLimit
      ? (this.tileLimit += number)
      : (this.tileLimit = this.searchResults.length);
    console.log('Tile limit:', this.tileLimit);
  }
}
