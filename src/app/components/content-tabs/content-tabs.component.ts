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

  private _tileLimit = 14;
  @Input() set tileLimit(value: number) {
    this._tileLimit = value;
    this.fetchData();
  }

  private subscription: Subscription | null = null;

  constructor(private tmdbService: TmdbService, private router: Router) {}

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  private fetchData(): void {
    this.subscription?.unsubscribe();
    const endpoint = this.apiEndpoint || `/discover/movie`; // Default to movies
    const params: { with_genres?: number; sort_by?: string } = {};
    if (this.genreId !== 0) params.with_genres = this.genreId;
    if (this.sortBy) params.sort_by = this.sortBy;

    const itemsPerPage = 20;
    const pagesNeeded = Math.max(1, Math.ceil(this._tileLimit / itemsPerPage));
    const requests = Array.from({ length: pagesNeeded }, (_, i) =>
      this.tmdbService.fetchFromTmdb(endpoint, { ...params, page: i + 1 })
    );

    this.subscription = forkJoin(requests).subscribe((pagesData) => {
      const results = pagesData.reduce(
        (acc, page) => acc.concat(page.results),
        []
      );

      // Automatically determine media type if available
      this.trending = results.slice(0, this._tileLimit);
    });
  }
  redirectToPlayer(index: number): void {
    const selectedItem = this.trending[index];
    const mediaType = selectedItem.media_type || 'movie'; // Default to 'movie'
    this.router.navigate(['/player', selectedItem.id, mediaType]);
  }

  trackByFn(index: number, item: any): number {
    return item.id;
  }
}
