import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-search-results',
  templateUrl: './search-results.component.html',
  standalone: true,
  imports: [CommonModule],
})
export class SearchResultsComponent implements OnInit {
  BASE_URL = 'https://api.themoviedb.org/3';
  API_KEY = '2c6781f841ce2ad1608de96743a62eb9';
  searchResults: any[] = [];
  query: string = '';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.query = params.get('query') || '';
      if (this.query) {
        this.fetchResults();
      }
    });
  }

  fetchResults() {
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
        },
        error: (err) => console.error('Error fetching search results:', err),
      });
  }

  redirectToPlayer(item: any) {
    this.router.navigate(['/player', item.id, item.media_type], {
      queryParams: { name: item.title || item.name },
    });
  }
}
