import {
  Component,
  OnInit,
  Input,
  OnDestroy,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
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
export class ContentTabsComponent implements OnInit, OnDestroy, OnChanges {
  @Input() trending: any[] = [];
  @Input() apiEndpoint?: string;
  @Input() genreId: number = 0;
  @Input() sortBy?: string;

  private _tileLimit = 12;
  @Input() set tileLimit(value: number) {
    this._tileLimit = value;
    this.fetchData();
  }

  private subscription: Subscription | null = null;

  constructor(private tmdbService: TmdbService, private router: Router) {}

  ngOnInit(): void {
    this.fetchData();
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['apiEndpoint'] ||
      changes['genreId'] ||
      changes['sortBy'] ||
      changes['tileLimit']
    ) {
      this.fetchData();
    }
  }

  private fetchData(): void {
    if (!this.apiEndpoint) return;

    this.subscription?.unsubscribe();

    const params: { with_genres?: number; sort_by?: string } = {};
    if (this.genreId !== 0) params.with_genres = this.genreId;
    if (this.sortBy) params.sort_by = this.sortBy;

    const itemsPerPage = 20;
    const pagesNeeded = Math.ceil(this._tileLimit / itemsPerPage); // Removed unnecessary Math.max(1, ...)
    const requests = Array.from({ length: pagesNeeded }, (_, i) =>
      this.tmdbService.fetchFromTmdb(this.apiEndpoint!, {
        ...params,
        page: i + 1,
      })
    );

    this.subscription = forkJoin(requests).subscribe((pagesData) => {
      this.trending = pagesData
        .reduce((acc, page) => acc.concat(page.results), [])
        .filter((item: { poster_path: any }) => item.poster_path) // Filter out items with no poster
        .slice(0, this._tileLimit); // Simplified data concatenation and slicing
    });
  }

  redirectToPlayer(index: number): void {
    const selectedItem = this.trending[index];
    const mediaType = this.getMediaType(selectedItem);
    this.router.navigate(['/player', selectedItem.id, mediaType]);
  }

  private getMediaType(item: any): string {
    if (item.media_type) return item.media_type;
    // Infer type from the endpoint if media_type is not available
    return this.apiEndpoint?.includes('/tv/') ? 'tv' : 'movie';
  }

  trackByFn(index: number, item: any): number {
    return item.id;
  }
}
