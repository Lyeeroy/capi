import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  standalone: true,
  imports: [FormsModule, RouterModule],
})
export class HeaderComponent {
  BASE_URL = 'https://api.themoviedb.org/3';
  API_KEY = '2c6781f841ce2ad1608de96743a62eb9';
  query = '';
  searchResults: any[] = [];

  constructor(private http: HttpClient, private router: Router) {}

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
}
