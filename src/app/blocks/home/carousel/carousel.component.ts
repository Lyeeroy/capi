import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  HostListener,
  ElementRef,
  Renderer2,
  ChangeDetectorRef,
} from '@angular/core';
import { TmdbService } from '../../../services/tmdb.service';
import { CommonModule } from '@angular/common';
import { Subscription, forkJoin } from 'rxjs';
import { RouterLink } from '@angular/router';
import { IconLibComponent } from '../../../svg-icons/icon-lib.component';
import { WatchlistButtonComponent } from '../../../components/watchlist-button/watchlist-button.component';
import { WatchlistButtonOldComponent } from '../../../components/watchlist-button/watchlist-button-old.component';

@Component({
  selector: 'app-carousel',
  templateUrl: './carousel.component.html',
  imports: [
    CommonModule,
    RouterLink,
    IconLibComponent,
    WatchlistButtonComponent,
    WatchlistButtonOldComponent,
  ],
  standalone: true,
})
export class CarouselComponent implements OnInit, OnDestroy {
  @Input() autoplayInterval = 4000;
  @Input() dragThreshold = 50;
  items: any[] = [];
  currentSlide = 0;
  slideInterval: any;
  private fetchSubscription: Subscription | null = null;

  isDragging = false;
  startX = 0;
  currentTranslateX = 0;
  isMouseOver = false;

  constructor(
    private tmdbService: TmdbService,
    private el: ElementRef,
    private renderer: Renderer2,
    private cdRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.fetchData();
    this.startAutoplay();
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
    this.unsubscribeFetch();
    this.removeDragListeners();
  }

  fetchData(): void {
    const movieEndpoint = '/trending/movie/week';
    const tvEndpoint = '/trending/tv/week';

    this.unsubscribeFetch();
    this.fetchSubscription = forkJoin([
      this.tmdbService.fetchFromTmdb(movieEndpoint, {}),
      this.tmdbService.fetchFromTmdb(tvEndpoint, {}),
    ]).subscribe({
      next: ([movies, tvShows]) => {
        const movieItems = movies.results
          .slice(0, 5)
          .map((item: any) => ({ ...item, media_type: 'movie' }));
        const tvItems = tvShows.results
          .slice(0, 5)
          .map((item: any) => ({ ...item, media_type: 'tv' }));
        const mixedItems = [];
        const maxLength = Math.max(movieItems.length, tvItems.length);
        for (let i = 0; i < maxLength; i++) {
          if (i < movieItems.length) mixedItems.push(movieItems[i]);
          if (i < tvItems.length) mixedItems.push(tvItems[i]);
        }
        this.items = mixedItems.slice(0, 10);
        this.currentSlide = 0;
        this.cdRef.detectChanges();
      },
      error: (err) => console.error('Carousel error:', err),
    });
  }

  unsubscribeFetch(): void {
    if (this.fetchSubscription) {
      this.fetchSubscription.unsubscribe();
      this.fetchSubscription = null;
    }
  }

  startAutoplay(): void {
    this.stopAutoplay();
    if (
      !this.isMouseOver &&
      this.autoplayInterval > 0 &&
      this.items.length > 1
    ) {
      this.slideInterval = setInterval(
        () => this.nextSlide(),
        this.autoplayInterval
      );
    }
  }

  stopAutoplay(): void {
    clearInterval(this.slideInterval);
    this.slideInterval = null;
  }

  nextSlide(): void {
    if (this.items.length === 0) return;
    this.currentSlide = (this.currentSlide + 1) % this.items.length;
    this.cdRef.detectChanges();
  }

  prevSlide(): void {
    if (this.items.length === 0) return;
    this.currentSlide =
      (this.currentSlide - 1 + this.items.length) % this.items.length;
    this.cdRef.detectChanges();
  }

  onMouseEnter(): void {
    this.isMouseOver = true;
    this.stopAutoplay();
  }

  onMouseLeave(): void {
    this.isMouseOver = false;
    if (!this.isDragging) {
      this.startAutoplay();
    }
  }

  trackByFn(index: number, item: any): number {
    return item.id;
  }

  onDragStart(event: MouseEvent | TouchEvent): void {
    if (this.items.length <= 1) return;

    this.isDragging = true;
    this.startX =
      event instanceof MouseEvent ? event.clientX : event.touches[0].clientX;
    this.stopAutoplay();

    const slideContainer =
      this.el.nativeElement.querySelector('.slide-container');
    if (slideContainer) {
      this.renderer.addClass(slideContainer, 'grabbing');
      this.renderer.removeClass(slideContainer, 'grab');
    }

    if (event instanceof MouseEvent) {
      event.preventDefault();
    }

    this.addDragListeners();
  }

  onDragging(event: MouseEvent | TouchEvent): void {
    if (!this.isDragging) return;

    if (event instanceof TouchEvent) {
      event.preventDefault();
    }
  }

  onDragEnd(event: MouseEvent | TouchEvent): void {
    if (!this.isDragging) return;

    const endX =
      event instanceof MouseEvent
        ? event.clientX
        : event.changedTouches[0].clientX;
    const deltaX = endX - this.startX;

    const slideContainer =
      this.el.nativeElement.querySelector('.slide-container');
    if (slideContainer) {
      this.renderer.removeClass(slideContainer, 'grabbing');
    }

    if (Math.abs(deltaX) > this.dragThreshold) {
      if (deltaX < 0) {
        this.nextSlide();
      } else {
        this.prevSlide();
      }
    }

    this.isDragging = false;
    this.startX = 0;

    this.removeDragListeners();

    if (!this.isMouseOver) {
      this.startAutoplay();
    }
  }

  private boundOnDragging: (event: MouseEvent | TouchEvent) => void =
    this.onDragging.bind(this);
  private boundOnDragEnd: (event: MouseEvent | TouchEvent) => void =
    this.onDragEnd.bind(this);

  addDragListeners(): void {
    window.addEventListener('mousemove', this.boundOnDragging, {
      passive: false,
    });
    window.addEventListener('touchmove', this.boundOnDragging, {
      passive: false,
    });
    window.addEventListener('mouseup', this.boundOnDragEnd);
    window.addEventListener('touchend', this.boundOnDragEnd);
    window.addEventListener('mouseleave', this.boundOnDragEnd);
    window.addEventListener('touchcancel', this.boundOnDragEnd);
  }

  removeDragListeners(): void {
    window.removeEventListener('mousemove', this.boundOnDragging);
    window.removeEventListener('touchmove', this.boundOnDragging);
    window.removeEventListener('mouseup', this.boundOnDragEnd);
    window.removeEventListener('touchend', this.boundOnDragEnd);
    window.removeEventListener('mouseleave', this.boundOnDragEnd);
    window.removeEventListener('touchcancel', this.boundOnDragEnd);
  }
}
