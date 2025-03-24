import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { TmdbService } from '../../services/tmdb.service';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-content-tabs',
  templateUrl: './content-tabs.component.html',
  imports: [CommonModule, RouterModule],
  standalone: true,
})
export class ContentTabsComponent implements OnInit, OnDestroy {
  @Input() trending: any[] = [];
  @Input() type: 'movie' | 'tv' = 'movie';
  @Input() apiEndpoint?: string;
  @Input() genreId: number = 0;
  @Input() sortBy?: string;

  private subscription: Subscription | null = null;

  constructor(private tmdbService: TmdbService, private router: Router) {}

  ngOnInit() {
    // 2. Check if trending is already provided
    if (this.trending.length > 0) return;

    const endpoint = this.apiEndpoint || `/discover/${this.type}`;
    const params: { with_genres?: number; sort_by?: string } = {};

    // 3. Only include valid genreId
    if (this.genreId !== 0) {
      params.with_genres = this.genreId;
    }

    if (this.sortBy) {
      params.sort_by = this.sortBy;
    }

    // 4. Added subscription management
    this.subscription = this.tmdbService
      .fetchFromTmdb(endpoint, params)
      .subscribe((data) => {
        this.trending = data.results;
      });
  }

  ngOnDestroy() {
    // 5. Unsubscribe on destroy
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  redirectToPlayer(index: number): void {
    const selectedItem = this.trending[index];
    this.router.navigate(['/player', selectedItem.id, this.type]);
  }

  // 6. TrackBy function for optimized list rendering
  trackByFn(index: number, item: any): number {
    return item.id;
  }
}

// {
//   "genres": [
//     {
//       "id": 10759,
//       "name": "Action & Adventure"
//     },
//     {
//       "id": 16,
//       "name": "Animation"
//     },
//     {
//       "id": 35,
//       "name": "Comedy"
//     },
//     {
//       "id": 80,
//       "name": "Crime"
//     },
//     {
//       "id": 99,
//       "name": "Documentary"
//     },
//     {
//       "id": 18,
//       "name": "Drama"
//     },
//     {
//       "id": 10751,
//       "name": "Family"
//     },
//     {
//       "id": 10762,
//       "name": "Kids"
//     },
//     {
//       "id": 9648,
//       "name": "Mystery"
//     },
//     {
//       "id": 10763,
//       "name": "News"
//     },
//     {
//       "id": 10764,
//       "name": "Reality"
//     },
//     {
//       "id": 10765,
//       "name": "Sci-Fi & Fantasy"
//     },
//     {
//       "id": 10766,
//       "name": "Soap"
//     },
//     {
//       "id": 10767,
//       "name": "Talk"
//     },
//     {
//       "id": 10768,
//       "name": "War & Politics"
//     },
//     {
//       "id": 37,
//       "name": "Western"
//     }
//   ]
// }
