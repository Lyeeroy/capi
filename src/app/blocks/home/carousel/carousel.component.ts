import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ElementRef,
  Renderer2,
  ChangeDetectorRef,
} from '@angular/core';
import { TmdbService } from '../../../services/tmdb.service';
import { WatchlistService } from '../../../services/watchlist.service';
import { CommonModule } from '@angular/common';
import { Subscription, forkJoin } from 'rxjs';
import { RouterLink } from '@angular/router';
import { IconLibComponent } from '../../../svg-icons/icon-lib.component';
import { WatchlistButtonOldComponent } from '../../../components/watchlist-button/watchlist-button-old.component';

@Component({
  selector: 'app-carousel',
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.css'],
  imports: [
    CommonModule,
    RouterLink,
    IconLibComponent,
    WatchlistButtonOldComponent,
  ],
  standalone: true,
})
export class CarouselComponent implements OnInit, OnDestroy {
  @Input() autoplayInterval = 5000;
  @Input() dragThreshold = 50; // pixels

  items: any[] = [];
  currentSlide = 0;
  slideInterval: any;

  // Drag state
  isDragging = false;
  startX = 0;
  currentTranslateX = 0;
  isMouseOver = false;

  private fetchSubscription: Subscription | null = null;
  private slideChangeDebounceTimer: any;
  private preloadedImages: Set<string> = new Set();

  constructor(
    private tmdbService: TmdbService,
    public watchlistService: WatchlistService,
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

    if (this.slideChangeDebounceTimer) {
      clearTimeout(this.slideChangeDebounceTimer);
    }

    this.preloadedImages.clear();
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
        this.preloadImages(0);
        this.cdRef.detectChanges();
      },
      error: (err) => console.error('Carousel fetch error:', err),
    });
  }

  private unsubscribeFetch(): void {
    if (this.fetchSubscription) {
      this.fetchSubscription.unsubscribe();
      this.fetchSubscription = null;
    }
  }

  private preloadImages(currentIndex: number): void {
    if (this.items.length === 0) return;

    const nextIndex = (currentIndex + 1) % this.items.length;
    const prevIndex =
      (currentIndex - 1 + this.items.length) % this.items.length;

    [nextIndex, prevIndex].forEach((index) => {
      const item = this.items[index];
      if (item?.backdrop_path) {
        const imageUrl =
          'https://image.tmdb.org/t/p/w1280' + item.backdrop_path;
        if (!this.preloadedImages.has(imageUrl)) {
          const img = new Image();
          img.src = imageUrl;
          this.preloadedImages.add(imageUrl);
        }
      }
    });
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
    if (this.slideInterval) {
      clearInterval(this.slideInterval);
      this.slideInterval = null;
    }
  }

  private debounceSlideChange(callback: () => void): void {
    if (this.slideChangeDebounceTimer) {
      clearTimeout(this.slideChangeDebounceTimer);
    }
    this.slideChangeDebounceTimer = setTimeout(callback, 50);
  }

  goToSlide(index: number): void {
    if (this.items.length === 0 || index === this.currentSlide) return;

    this.debounceSlideChange(() => {
      this.currentSlide = index;
      this.currentTranslateX = 0;
      this.preloadImages(this.currentSlide);
      this.cdRef.detectChanges();
      this.stopAutoplay();
      if (!this.isMouseOver) {
        this.startAutoplay();
      }
    });
  }

  nextSlide(): void {
    if (this.items.length === 0) return;

    this.debounceSlideChange(() => {
      this.currentSlide = (this.currentSlide + 1) % this.items.length;
      this.currentTranslateX = 0;
      this.preloadImages(this.currentSlide);
      this.cdRef.detectChanges();
    });
  }

  prevSlide(): void {
    if (this.items.length === 0) return;

    this.debounceSlideChange(() => {
      this.currentSlide =
        (this.currentSlide - 1 + this.items.length) % this.items.length;
      this.currentTranslateX = 0;
      this.preloadImages(this.currentSlide);
      this.cdRef.detectChanges();
    });
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

  // ============================================
  // DRAG HANDLERS - FIXED
  // ============================================

  onDragStart(event: MouseEvent | TouchEvent): void {
    if (this.items.length <= 1) return;

    this.isDragging = true;
    this.startX =
      event instanceof MouseEvent ? event.clientX : event.touches[0].clientX;

    this.stopAutoplay();

    if (event instanceof MouseEvent) {
      event.preventDefault();
    }

    this.addDragListeners();
  }

  onDragging(event: MouseEvent | TouchEvent): void {
    if (!this.isDragging) return;

    const currentX =
      event instanceof MouseEvent ? event.clientX : event.touches[0].clientX;

    const deltaX = currentX - this.startX;
    const containerWidth = this.el.nativeElement.offsetWidth;

    // Convert pixel offset to percentage
    this.currentTranslateX = (deltaX / containerWidth) * 100;

    // Limit the drag range with resistance
    const maxDrag = 100;
    if (Math.abs(this.currentTranslateX) > maxDrag) {
      const over = Math.abs(this.currentTranslateX) - maxDrag;
      const resistance = Math.pow(0.5, over / 50); // Exponential resistance
      this.currentTranslateX =
        Math.sign(this.currentTranslateX) * (maxDrag + over * resistance);
    }

    if (event instanceof TouchEvent) {
      event.preventDefault();
    }

    this.cdRef.detectChanges();
  }

  onDragEnd(event: MouseEvent | TouchEvent): void {
    if (!this.isDragging) return;

    const endX =
      event instanceof MouseEvent
        ? event.clientX
        : event.changedTouches[0].clientX;

    const deltaX = endX - this.startX;

    this.isDragging = false;
    this.removeDragListeners();

    // Determine target slide based on drag distance
    if (Math.abs(deltaX) > this.dragThreshold) {
      // Dragged enough - go to next/prev slide
      if (deltaX > 0) {
        // Dragged right - go to previous slide
        this.currentSlide =
          (this.currentSlide - 1 + this.items.length) % this.items.length;
      } else {
        // Dragged left - go to next slide
        this.currentSlide = (this.currentSlide + 1) % this.items.length;
      }
      this.preloadImages(this.currentSlide);
    }

    // IMMEDIATELY reset translate to 0 so CSS transition takes over
    this.currentTranslateX = 0;
    this.cdRef.detectChanges();

    if (!this.isMouseOver) {
      this.startAutoplay();
    }
  }

  private boundOnDragging = this.onDragging.bind(this);
  private boundOnDragEnd = this.onDragEnd.bind(this);

  private addDragListeners(): void {
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

  private removeDragListeners(): void {
    window.removeEventListener('mousemove', this.boundOnDragging);
    window.removeEventListener('touchmove', this.boundOnDragging);
    window.removeEventListener('mouseup', this.boundOnDragEnd);
    window.removeEventListener('touchend', this.boundOnDragEnd);
    window.removeEventListener('mouseleave', this.boundOnDragEnd);
    window.removeEventListener('touchcancel', this.boundOnDragEnd);
  }
}
