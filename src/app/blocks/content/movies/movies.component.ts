import { Component, HostListener } from '@angular/core';
import { ContentTabsComponent } from '../../../components/content-tabs/content-tabs.component';
import { SortHeaderComponent } from '../sort-header/sort-header.component';

@Component({
  selector: 'app-movies',
  templateUrl: './movies.component.html',
  standalone: true,
  imports: [ContentTabsComponent, SortHeaderComponent],
})
export class MoviesComponent {
  tileLimit = 42; // Initial number of items
  isLoading = false; // To prevent multiple triggers
  scrollThreshold = 100; // Number of pixels from bottom to trigger load

  @HostListener('window:scroll', [])
  onWindowScroll() {
    if (this.isLoading) return;

    const nearBottom =
      window.innerHeight + window.scrollY >=
      document.body.offsetHeight - this.scrollThreshold;

    if (nearBottom) {
      this.isLoading = true;
      this.tileLimit += 14; // Increase by same initial amount
      console.log('Loading more items... tileLimit:', this.tileLimit); //'); // Debugging log
      // Simulate an API call with a timeout
      setTimeout(() => (this.isLoading = false), 500); // Reset after 0.5s
    }
  }
}
