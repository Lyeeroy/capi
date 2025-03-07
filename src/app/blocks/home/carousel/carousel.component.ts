import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-carousel',
  templateUrl: './carousel.component.html',
  imports: [CommonModule],
})
export class CarouselComponent {
  @Input() mediaItems: {
    backdropUrl: string;
    title: string;
    releaseDate: string;
    mediaType: string;
    overview: string;
  }[] = [];

  currentIndex: number = 0;

  prev(): void {
    this.currentIndex =
      this.currentIndex > 0
        ? this.currentIndex - 1
        : this.mediaItems.length - 1;
  }

  next(): void {
    this.currentIndex =
      this.currentIndex < this.mediaItems.length - 1
        ? this.currentIndex + 1
        : 0;
  }

  goToSlide(index: number): void {
    this.currentIndex = index;
  }

  pauseAutoAdvance(): void {
    // Implement logic to pause automatic carousel advancement
  }

  resumeAutoAdvance(): void {
    // Implement logic to resume automatic carousel advancement
  }
}
