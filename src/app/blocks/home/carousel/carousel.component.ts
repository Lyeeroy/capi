import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  HostListener, // Keep if used elsewhere, not strictly needed for this layout
  ElementRef, // Keep if used elsewhere, not strictly needed for this layout
} from '@angular/core';
import { TmdbService } from '../../../services/tmdb.service';
import { CommonModule } from '@angular/common';
import { Subscription, forkJoin } from 'rxjs';
import { RouterLink } from '@angular/router';
import { IconLibComponent } from '../../../svg-icons/icon-lib.component';

@Component({
  selector: 'app-carousel',
  templateUrl: './carousel.component.html',
  imports: [CommonModule, RouterLink, IconLibComponent],
  standalone: true,
})
export class CarouselComponent implements OnInit, OnDestroy {
  @Input() autoplayInterval = 4000;
  items: any[] = [];
  currentSlide = 0;
  slideInterval: any;
  private fetchSubscription: Subscription | null = null;

  constructor(private tmdbService: TmdbService) {}

  ngOnInit(): void {
    this.fetchData();
    this.startAutoplay();
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
    this.unsubscribeFetch();
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
        // Ensure backdrop_path and poster_path are available if needed
        const movieItems = movies.results
          .slice(0, 5)
          .map((item: any) => ({ ...item, media_type: 'movie' })); // Add media_type explicitly
        const tvItems = tvShows.results
          .slice(0, 5)
          .map((item: any) => ({ ...item, media_type: 'tv' })); // Add media_type explicitly
        const mixedItems = [];

        // Interleave movies and TV shows
        const maxLength = Math.max(movieItems.length, tvItems.length);
        for (let i = 0; i < maxLength; i++) {
          if (i < movieItems.length) mixedItems.push(movieItems[i]);
          if (i < tvItems.length) mixedItems.push(tvItems[i]);
        }

        this.items = mixedItems.slice(0, 10); // Limit to 10 items total
        this.currentSlide = 0;
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
    // Ensure interval is cleared before starting a new one
    clearInterval(this.slideInterval);
    this.slideInterval = setInterval(
      () => this.nextSlide(),
      this.autoplayInterval
    );
  }

  stopAutoplay(): void {
    clearInterval(this.slideInterval);
  }

  nextSlide(): void {
    if (this.items.length === 0) return;
    this.currentSlide = (this.currentSlide + 1) % this.items.length;
  }

  prevSlide(): void {
    if (this.items.length === 0) return;
    this.currentSlide =
      (this.currentSlide - 1 + this.items.length) % this.items.length;
  }

  onMouseEnter(): void {
    this.stopAutoplay();
  }

  onMouseLeave(): void {
    this.startAutoplay();
  }

  trackByFn(index: number, item: any): number {
    return item.id;
  }
}
