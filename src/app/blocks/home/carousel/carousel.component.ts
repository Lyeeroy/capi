// src/app/blocks/home/carousel/carousel.component.ts
import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { TmdbService } from '../../../services/tmdb.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-carousel',
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.css'],
  imports: [CommonModule],
})
export class CarouselComponent implements OnInit, OnDestroy {
  @Input() type: 'movie' | 'tv' = 'movie'; // Set default to movie
  @Input() itemsPerPage = 3; // Default slides per view
  items: any[] = [];
  currentSlide = 0;
  slideInterval: any;

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
  }

  fetchData(): void {
    const endpoint = this.type === 'movie' ? '/movie/popular' : '/tv/popular';

    this.tmdbService.fetchFromTmdb(endpoint, {}).subscribe({
      next: (data) => (this.items = data.results),
      error: (err) => console.error('Carousel error:', err),
    });
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
