import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { TmdbService } from '../../services/tmdb.service';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subscription, forkJoin } from 'rxjs';

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
  @Input() tileLimit: number = 14;

  private subscription: Subscription | null = null;

  constructor(private tmdbService: TmdbService, private router: Router) {}

  ngOnInit() {
    if (this.trending.length > 0) return;

    const endpoint = this.apiEndpoint || `/discover/${this.type}`;
    const params: { with_genres?: number; sort_by?: string } = {};

    if (this.genreId !== 0) {
      params.with_genres = this.genreId;
    }
    if (this.sortBy) {
      params.sort_by = this.sortBy;
    }

    // Calculate optimal number of pages to fetch
    const itemsPerPage = 20;
    const pagesNeeded = Math.max(1, Math.ceil(this.tileLimit / itemsPerPage));

    // Create array of page requests
    const requests = Array.from({ length: pagesNeeded }, (_, i) => i + 1).map(
      (page) => this.tmdbService.fetchFromTmdb(endpoint, { ...params, page })
    );

    this.subscription = forkJoin(requests).subscribe((pagesData) => {
      // Combine results and apply strict limit
      this.trending = []
        .concat(...pagesData.map((data) => data.results))
        .slice(0, this.tileLimit);
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  redirectToPlayer(index: number): void {
    const selectedItem = this.trending[index];
    this.router.navigate(['/player', selectedItem.id, this.type]);
  }

  // TrackBy function for optimized list rendering
  trackByFn(index: number, item: any): number {
    return item.id;
  }
}
