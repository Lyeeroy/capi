import { Component, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Required for ngModel

@Component({
  selector: 'app-sort-header',
  templateUrl: './sort-header.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [
    `
      /* Hide scrollbar */
      .scroll-hidden::-webkit-scrollbar {
        display: none;
      }
      .scroll-hidden {
        -ms-overflow-style: none; /* IE and Edge */
        scrollbar-width: none; /* Firefox */
      }
    `,
  ],
})
export class SortHeaderComponent {
  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLElement>;

  selectedSort = '';
  selectedFilter = '';

  genres = [
    { name: 'Action & Adventure', isActive: true },
    { name: 'Animation', isActive: false },
    { name: 'Comedy', isActive: false },
    { name: 'Crime', isActive: false },
    { name: 'Documentary', isActive: false },
    { name: 'Drama', isActive: false },
    { name: 'Family', isActive: false },
    { name: 'Kids', isActive: false },
    { name: 'Mystery', isActive: false },
    { name: 'News', isActive: false },
    { name: 'Reality', isActive: false },
    { name: 'Sci-Fi', isActive: false },
    { name: 'Horror', isActive: false },
    { name: 'Musical', isActive: false },
    { name: 'Music Videos & Concerts', isActive: false },
    { name: 'Romance', isActive: false },
    { name: 'Thriller', isActive: false },
    { name: 'War', isActive: false },
    { name: 'Western', isActive: false },
    { name: 'Fantasy', isActive: false },
  ];

  scrollContent(direction: number) {
    const container = this.scrollContainer.nativeElement;
    container.scrollBy({
      left: direction * 50, // Adjust based on button width
      behavior: 'smooth',
    });
  }

  toggleActive(genre: any) {
    this.genres.forEach((g) => (g.isActive = g === genre));
  }
}
