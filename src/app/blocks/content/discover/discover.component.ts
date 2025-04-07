import { Component, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ContentTabsComponent } from '../../../components/content-tabs/content-tabs.component';
import { SortHeaderComponent } from '../sort-header/sort-header.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-discover',
  templateUrl: './discover.component.html',
  standalone: true,
  imports: [ContentTabsComponent, SortHeaderComponent, CommonModule],
})
export class DiscoverComponent implements OnInit {
  tileLimit: number = 42;
  isLoading: boolean = false;
  scrollThreshold: number = 100;
  cooldown: number = 1000;
  lastLoadTime: number = 0;

  genreId: number = 0;
  sortValue: string = '';
  mediaType: 'movie' | 'tv' = 'movie';

  mergedEndpoint: string = `/discover/${this.mediaType}`;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    // Subscribe to route data changes
    this.route.data.subscribe(data => {
      this.mediaType = data['mediaType'] || 'movie';
      // Update the mergedEndpoint whenever mediaType changes
      this.mergedEndpoint = `/discover/${this.mediaType}`;
    });
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    this.checkScroll();
  }

  onGenreId(genreId: number): void {
    this.genreId = genreId;
  }

  onSortBy(sortValue: string): void {
    this.sortValue = sortValue;
  }

  checkScroll(): void {
    window.requestAnimationFrame(() => {
      const now: number = Date.now();
      if (this.isLoading || now - this.lastLoadTime < this.cooldown) return;
      const scrollPosition: number = window.innerHeight + window.scrollY;
      const documentHeight: number = document.documentElement.scrollHeight;
      if (scrollPosition >= documentHeight - this.scrollThreshold) {
        this.loadMore();
      }
    });
  }

  loadMore(): void {
    this.lastLoadTime = Date.now();
    this.isLoading = true;
    this.tileLimit += 12;
    console.log('Loading more items... tileLimit:', this.tileLimit);
    setTimeout(() => {
      this.isLoading = false;
      this.checkScroll();
    }, this.cooldown);
  }
}
