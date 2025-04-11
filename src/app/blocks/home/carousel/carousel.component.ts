import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  HostListener,
  ElementRef,
} from '@angular/core';
import { TmdbService } from '../../../services/tmdb.service';
import { CommonModule } from '@angular/common';
import { Subscription, forkJoin } from 'rxjs';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-carousel',
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.css'],
  imports: [CommonModule, RouterLink],
  standalone: true,
})
export class CarouselComponent implements OnInit, OnDestroy {
  @Input() autoplayInterval = 3000; // Optional
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
        const movieItems = movies.results.slice(0, 5);
        const tvItems = tvShows.results.slice(0, 5);
        const mixedItems = [];

        for (let i = 0; i < 10; i++) {
          if (i % 2 === 0 && movieItems.length) {
            mixedItems.push(movieItems.shift());
          } else if (tvItems.length) {
            mixedItems.push(tvItems.shift());
          }
        }

        this.items = mixedItems;
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
    this.slideInterval = setInterval(() => this.nextSlide(), this.autoplayInterval);
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
    this.currentSlide = (this.currentSlide - 1 + this.items.length) % this.items.length;
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
