// src/app/blocks/home/carousel/carousel.component.ts
import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { TmdbService } from '../../../services/tmdb.service';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-carousel',
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.css'],
  imports: [CommonModule],
})
export class CarouselComponent implements OnInit, OnDestroy {
  @Input() itemsPerPage = 3; // Default slides per view
  items: any[] = [];
  currentSlide = 0;
  slideInterval: any;
  private fetchSubscription: Subscription | null = null;

  constructor(private tmdbService: TmdbService) {}

  ngOnInit(): void {
    this.fetchData();
    this.startAutoplay();
  }
  getArrayFromLength(length: number): number[] {
    return Array.from({ length }, (_, i) => i);
  }
  ngOnDestroy(): void {
    this.stopAutoplay();
    this.unsubscribeFetch();
  }

  fetchData(): void {
    const movieEndpoint = '/trending/movie/week';
    const tvEndpoint = '/trending/tv/week';

    this.unsubscribeFetch(); // Ensure any previous subscription is cleared
    this.fetchSubscription = forkJoin(
      this.tmdbService.fetchFromTmdb(movieEndpoint, {}),
      this.tmdbService.fetchFromTmdb(tvEndpoint, {})
    ).subscribe({
      next: ([movies, tvShows]) => {
        this.items = movies.results.concat(tvShows.results);
      },
      error: (err) => console.error('Carousel error:', err),
    });
  }

  private unsubscribeFetch(): void {
    if (this.fetchSubscription) {
      this.fetchSubscription.unsubscribe();
      this.fetchSubscription = null;
    }
  }

  startAutoplay(): void {
    this.slideInterval = setInterval(() => this.nextSlide(), 3000);
  }

  stopAutoplay(): void {
    clearInterval(this.slideInterval);
  }

  nextSlide(): void {
    this.currentSlide = (this.currentSlide + 1) % this.items.length;
  }

  prevSlide(): void {
    this.currentSlide =
      (this.currentSlide - 1 + this.items.length) % this.items.length;
  }

  trackByFn(index: number, item: any): number {
    return item.id;
  }
}
