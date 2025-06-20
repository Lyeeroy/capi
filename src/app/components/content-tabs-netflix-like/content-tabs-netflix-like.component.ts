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

@Component({
  selector: 'app-content-tabs-netflix-like',
  templateUrl: './content-tabs-netflix-like.component.html',
  styleUrls: ['./content-tabs-netflix-like.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule],
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
  private isDragging = false;
  private dragStartX = 0;
  private scrollStartLeft = 0;
  private dragDistance = 0;
  private readonly DRAG_THRESHOLD = 10; // px
  private isTouch = false;
  private touchStartTime = 0;

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
  onMouseDown(event: MouseEvent): void {
    // Only handle mouse events, not touch
    event.preventDefault();
    this.isTouch = false;
    this.isDragging = true;
    this.dragStartX = event.clientX;
    this.scrollStartLeft = this.scrollContainer.nativeElement.scrollLeft;
    this.dragDistance = 0;
    this.scrollContainer.nativeElement.classList.add('dragging');
  }

  onTouchStart(event: TouchEvent): void {
    // For touch events, we want to allow native scrolling but track for click detection
    this.isTouch = true;
    this.isDragging = true;
    this.touchStartTime = Date.now();
    this.dragStartX = event.touches[0].clientX;
    this.scrollStartLeft = this.scrollContainer.nativeElement.scrollLeft;
    this.dragDistance = 0;
    // Don't prevent default to allow native touch momentum scrolling
  }

  onMouseMove(event: MouseEvent): void {
    if (!this.isDragging || this.isTouch) return;
    event.preventDefault();
    const dx = event.clientX - this.dragStartX;
    this.dragDistance = Math.abs(dx);
    this.scrollContainer.nativeElement.scrollLeft = this.scrollStartLeft - dx;
  }

  onTouchMove(event: TouchEvent): void {
    if (!this.isDragging || !this.isTouch) return;
    // Don't prevent default to allow native momentum scrolling
    const dx = event.touches[0].clientX - this.dragStartX;
    this.dragDistance = Math.abs(dx);
    // Don't manually set scrollLeft for touch - let native scrolling handle it
  }

  onMouseUpOrLeave(): void {
    if (!this.isTouch) {
      this.isDragging = false;
      this.scrollContainer.nativeElement.classList.remove('dragging');
    }
  }

  onTouchEnd(): void {
    if (this.isTouch) {
      this.isDragging = false;
      this.scrollContainer.nativeElement.classList.remove('dragging');
    }
  }

  onTileClick(event: MouseEvent, index: number): void {
    // For touch events, also check timing to differentiate from quick taps
    const isQuickTap = this.isTouch && (Date.now() - this.touchStartTime) < 200;
    
    if (this.dragDistance > this.DRAG_THRESHOLD && !isQuickTap) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.redirectToPlayer(index);
  }
}
