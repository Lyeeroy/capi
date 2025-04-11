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
import { Subscription } from 'rxjs';
import { forkJoin } from 'rxjs';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-carousel',
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.css'],
  imports: [CommonModule, RouterLink],
  standalone: true, // If you're using Angular 14+ and standalone components
})
export class CarouselComponent implements OnInit, OnDestroy {
  @Input() itemsPerPage = 3; // Default slides per view
  items: any[] = [];
  currentSlide = 0;
  slideInterval: any;
  private fetchSubscription: Subscription | null = null;

  constructor(private tmdbService: TmdbService, private el: ElementRef) {}

  ngOnInit(): void {
    this.fetchData();
    this.startAutoplay();
    this.adjustItemsPerPage();
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.adjustItemsPerPage();
  }

  adjustItemsPerPage(): void {
    const width = this.el.nativeElement.offsetWidth;
    if (width < 768) {
      this.itemsPerPage = 1;
    } else if (width < 1024) {
      this.itemsPerPage = 2;
    } else {
      this.itemsPerPage = 3;
    }
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
        const mixedItems = [];
        const movieItems = movies.results.slice(0, 5);
        const tvItems = tvShows.results.slice(0, 5);

        for (let i = 0; i < 10; i++) {
          if (i % 2 === 0) {
            mixedItems.push(movieItems.pop());
          } else {
            mixedItems.push(tvItems.pop());
          }
        }

        this.items = mixedItems;
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
    this.currentSlide = (this.currentSlide - 1 + this.items.length) % this.items.length;
  }

  trackByFn(index: number, item: any): number {
    return item.id;
  }

  onMouseEnter(): void {
    this.stopAutoplay();
  }

  onMouseLeave(): void {
    this.startAutoplay();
  }
}