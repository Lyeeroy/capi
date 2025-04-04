import { Component, HostListener } from '@angular/core';
import { ContentTabsComponent } from '../../../components/content-tabs/content-tabs.component';
import { SortHeaderComponent } from '../sort-header/sort-header.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tvshows',
  templateUrl: './movies.component.html',
  standalone: true,
  imports: [ContentTabsComponent, SortHeaderComponent, CommonModule],
})
export class MoviesComponent {
  tileLimit: number = 42;
  isLoading: boolean = false;
  scrollThreshold: number = 100;
  cooldown: number = 1000;
  lastLoadTime: number = 0;

  genreId: number = 0;
  sortValue: string ='';

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    this.checkScroll();
  }

  onGenreId(genreId: number) {
    this.genreId = genreId;
  }
  
  onSortBy(sortValue: string) {
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
    this.tileLimit += 14;
    console.log('Loading more items... tileLimit:', this.tileLimit);
    setTimeout(() => {
      this.isLoading = false;
      this.checkScroll();
    }, this.cooldown);
  }
}
