import {
  Component,
  Input,
  OnInit,
  OnChanges,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-circular-progress',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="relative inline-flex items-center justify-center"
      [ngClass]="{
        'bg-black/30 backdrop-blur-sm rounded-full': hasBackground && progress > 0,
        'cursor-pointer': progress > 0
      }"
      [style.width.px]="hasBackground ? size + 8 : size"
      [style.height.px]="hasBackground ? size + 8 : size"
      (click)="onProgressClick($event)"
    >
      <svg
        *ngIf="progress > 0"
        class="transform -rotate-90"
        [attr.width]="size"
        [attr.height]="size"
      >
        <!-- Background circle (zinc color) -->
        <circle
          [attr.cx]="centerX"
          [attr.cy]="centerY"
          [attr.r]="radius"
          [attr.stroke-width]="strokeWidth"
          fill="none"
          stroke="#71717a"
          class="opacity-30"
        />

        <!-- Progress arc (colored based on state) -->
        <circle
          [attr.cx]="centerX"
          [attr.cy]="centerY"
          [attr.r]="radius"
          [attr.stroke-width]="strokeWidth"
          fill="none"
          [attr.stroke-dasharray]="circumference"
          [attr.stroke-dashoffset]="strokeDashoffset"
          stroke-linecap="round"
          [attr.stroke]="getStrokeColor()"
          class="transition-all duration-200 ease-out hover:opacity-80"
          opacity="0.9"
        />
      </svg>
    </div>
  `,
  styles: [
    `
      :host {
        display: inline-block;
      }
    `,
  ],
})
export class CircularProgressComponent implements OnInit, OnChanges {
  @Input() progress: number = 0; // Progress from 0 to 1
  @Input() size: number = 16; // Size in pixels
  @Input() strokeWidth: number = 2; // Stroke width in pixels
  @Input() isCurrentEpisode: boolean = false;
  @Input() isWatched: boolean = false;
  @Input() showPercentage: boolean = false; // Show percentage text for partially watched
  @Input() hasBackground: boolean = false; // Add background behind the circle
  @Output() progressClick = new EventEmitter<void>();

  centerX: number = 0;
  centerY: number = 0;
  radius: number = 0;
  circumference: number = 0;
  strokeDashoffset: number = 0;
  strokeLinecap: string = 'round';

  ngOnInit() {
    this.calculateCircleProperties();
  }

  ngOnChanges() {
    this.calculateCircleProperties();
  }

  getProgressPercentage(): number {
    return Math.round(this.progress * 100);
  }

  getStrokeColor(): string {
    if (this.isCurrentEpisode) {
      return '#ffffff';
    } else if (this.isWatched) {
      return '#3b82f6'; // green-500
    } else {
      return '#3b82f6'; // blue-500
    }
  }

  onProgressClick(event?: Event): void {
    // Prevent event propagation to parent elements
    if (event) {
      event.stopPropagation();
    }

    // Only emit click event if it's watched or partially watched
    if (this.progress > 0) {
      this.progressClick.emit();
    }
  }

  private calculateCircleProperties() {
    this.centerX = this.size / 2;
    this.centerY = this.size / 2;
    this.radius = (this.size - this.strokeWidth) / 2;
    this.circumference = 2 * Math.PI * this.radius;

    // Calculate stroke dash offset based on progress
    // For clockwise progress starting from top
    this.strokeDashoffset =
      this.circumference * (1 - Math.max(0, Math.min(1, this.progress)));
  }
}
