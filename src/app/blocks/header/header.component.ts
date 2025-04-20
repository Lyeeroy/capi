// src/app/blocks/header/header.component.ts
import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TmdbService } from '../../services/tmdb.service'; // Adjust path as needed

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  standalone: true,
  imports: [FormsModule, RouterModule],
})
export class HeaderComponent {
  query = '';
  searchResults: any[] = [];

  constructor(private tmdbService: TmdbService, private router: Router) {}

  get sources() {
    const storedData = localStorage.getItem('sources');
    return storedData ? JSON.parse(storedData) : [];
  }

  searchMovies() {
    if (!this.query.trim()) {
      this.searchResults = [];
      return;
    }

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
}
