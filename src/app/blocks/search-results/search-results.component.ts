import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ContentTabsComponent } from '../../components/content-tabs/content-tabs.component';
import { IconLibComponent } from '../../svg-icons/icon-lib.component';

@Component({
  selector: 'app-search-results',
  templateUrl: './search-results.component.html',
  standalone: true,
  imports: [CommonModule, ContentTabsComponent, IconLibComponent],
})
export class SearchResultsComponent implements OnInit {
  BASE_URL = 'https://api.themoviedb.org/3';
  API_KEY = '2c6781f841ce2ad1608de96743a62eb9';
  searchResults: any[] = [];
  query: string = '';
  url: string = '';
  tileLimit: number = 7; // Default limit for tiles

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.resetResultsOnQueryChange(params.get('query') || '');
      const query = params.get('query') || '';
      this.url = query
        ? `/search/multi?api_key=${this.API_KEY}&query=${query}`
        : '';
      console.log('Constructed URL:', this.url); // Debugging the URL
    });
  }

  tileLimitOnResultLength() {
    if (this.searchResults.length > 0) {
      this.tileLimit = this.searchResults.length;
    }
  }

  resetResultsOnQueryChange(query: string) {
    this.query = query;
    this.tileLimit = 7; // Reset tile limit when query changes
  }

  showMore(number: number) {
    this.tileLimit
      ? (this.tileLimit += number)
      : (this.tileLimit = this.searchResults.length);
    console.log('Tile limit:', this.tileLimit); // Debugging the tile limit
  }
}

//   fetchResults() {
//     this.http
//       .get<any>(
//         `${this.BASE_URL}/search/multi?api_key=${this.API_KEY}&query=${this.query}`
//       )
//       .subscribe({
//         next: (data) => {
//           this.searchResults = data.results.filter(
//             (item: any) =>
//               item.poster_path &&
//               (item.media_type === 'movie' || item.media_type === 'tv')
//           );
//         },
//         error: (err) => console.error('Error fetching search results:', err),
//       });
//   }

//   redirectToPlayer(item: any) {
//     this.router.navigate(['/player', item.id, item.media_type], {
//       queryParams: { name: item.title || item.name },
//     });
//   }
// }
