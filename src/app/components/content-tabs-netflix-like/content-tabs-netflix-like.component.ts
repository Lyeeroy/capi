import {
  Component,
  OnInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  Input,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TmdbService } from '../../services/tmdb.service';
import { Subscription, forkJoin } from 'rxjs';
import { IconLibComponent } from '../../svg-icons/icon-lib.component';

@Component({
  selector: 'app-content-tabs-netflix-like',
  templateUrl: './content-tabs-netflix-like.component.html',
  standalone: true,
  imports: [CommonModule, RouterModule, IconLibComponent],
})
export class ContentTabsNetflixLikeComponent
  implements OnInit, OnChanges, OnDestroy
{
  @Input() trending: any[] = [];
  @Input() apiEndpoint?: string;
  @Input() genreId: number = 0;
  @Input() sortBy?: string;
  private _tileLimit = 20;
  @Input() set tileLimit(value: number) {
    this._tileLimit = value;
    this.fetchData();
  }
  private subscription: Subscription | null = null;
  @ViewChild('scrollContainer', { static: false }) scrollContainer!: ElementRef;
  constructor(private tmdbService: TmdbService, private router: Router) {}
  ngOnInit(): void {
    this.fetchData();
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
  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
  private fetchData(): void {
    if (!this.apiEndpoint) return;
    this.subscription?.unsubscribe();
    const params: { with_genres?: number; sort_by?: string } = {};
    if (this.genreId !== 0) params.with_genres = this.genreId;
    if (this.sortBy) params.sort_by = this.sortBy;
    const itemsPerPage = 20;
    const pagesNeeded = Math.ceil(this._tileLimit / itemsPerPage);
    const requests = Array.from({ length: pagesNeeded }, (_, i) =>
      this.tmdbService.fetchFromTmdb(this.apiEndpoint!, {
        ...params,
        page: i + 1,
      })
    );
    this.subscription = forkJoin(requests).subscribe((pagesData) => {
      this.trending = pagesData
        .reduce((acc, page) => acc.concat(page.results), [])
        .filter((item: { poster_path: any }) => item.poster_path)
        .slice(0, this._tileLimit);
    });
  }
  redirectToPlayer(index: number): void {
    const selectedItem = this.trending[index];
    const mediaType = this.getMediaType(selectedItem);
    this.router.navigate(['/player', selectedItem.id, mediaType]);
  }
  private getMediaType(item: any): string {
    if (item.media_type) return item.media_type;
    return this.apiEndpoint?.includes('/tv/') ? 'tv' : 'movie';
  }
  trackByFn(index: number, item: any): number {
    return item.id;
  }
  scrollLeft(): void {
    if (this.scrollContainer && this.scrollContainer.nativeElement) {
      this.scrollContainer.nativeElement.scrollBy({
        left: -500,
        behavior: 'smooth',
      });
    }
  }
  scrollRight(): void {
    if (this.scrollContainer && this.scrollContainer.nativeElement) {
      this.scrollContainer.nativeElement.scrollBy({
        left: 500,
        behavior: 'smooth',
      });
    }
  }
}
